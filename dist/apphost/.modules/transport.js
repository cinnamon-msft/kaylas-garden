"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AspireClient = exports.AppHostUsageError = exports.CapabilityError = exports.CancellationToken = exports.Handle = exports.AtsErrorCodes = void 0;
exports.isAtsError = isAtsError;
exports.isMarshalledHandle = isMarshalledHandle;
exports.registerHandleWrapper = registerHandleWrapper;
exports.wrapIfHandle = wrapIfHandle;
exports.isPromiseLike = isPromiseLike;
exports.registerCallback = registerCallback;
exports.unregisterCallback = unregisterCallback;
exports.getCallbackCount = getCallbackCount;
exports.registerCancellation = registerCancellation;
exports.unregisterCancellation = unregisterCancellation;
// transport.ts - ATS transport layer: RPC, Handle, errors, callbacks
const net = __importStar(require("net"));
const rpc = __importStar(require("vscode-jsonrpc/node.js"));
/**
 * ATS error codes returned by the server.
 */
exports.AtsErrorCodes = {
    /** Unknown capability ID */
    CapabilityNotFound: 'CAPABILITY_NOT_FOUND',
    /** Handle ID doesn't exist or was disposed */
    HandleNotFound: 'HANDLE_NOT_FOUND',
    /** Handle type doesn't satisfy capability's type constraint */
    TypeMismatch: 'TYPE_MISMATCH',
    /** Missing required argument or wrong type */
    InvalidArgument: 'INVALID_ARGUMENT',
    /** Argument value outside valid range */
    ArgumentOutOfRange: 'ARGUMENT_OUT_OF_RANGE',
    /** Error occurred during callback invocation */
    CallbackError: 'CALLBACK_ERROR',
    /** Unexpected error in capability execution */
    InternalError: 'INTERNAL_ERROR',
};
/**
 * Type guard to check if a value is an ATS error response.
 */
function isAtsError(value) {
    return (value !== null &&
        typeof value === 'object' &&
        '$error' in value &&
        typeof value.$error === 'object' &&
        value.$error !== null);
}
/**
 * Type guard to check if a value is a marshalled handle.
 */
function isMarshalledHandle(value) {
    return (value !== null &&
        typeof value === 'object' &&
        '$handle' in value &&
        '$type' in value);
}
function isAbortSignal(value) {
    return (value !== null &&
        typeof value === 'object' &&
        'aborted' in value &&
        'addEventListener' in value &&
        'removeEventListener' in value);
}
function isCancellationTokenLike(value) {
    return (value !== null &&
        typeof value === 'object' &&
        'register' in value &&
        typeof value.register === 'function' &&
        'toJSON' in value &&
        typeof value.toJSON === 'function');
}
function isPlainObject(value) {
    if (value === null || typeof value !== 'object') {
        return false;
    }
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}
function hasTransportValue(value) {
    return (value !== null &&
        typeof value === 'object' &&
        'toTransportValue' in value &&
        typeof value.toTransportValue === 'function');
}
function createAbortError(message) {
    const error = new Error(message);
    error.name = 'AbortError';
    return error;
}
function createCircularReferenceError(capabilityId, path) {
    return new AppHostUsageError(`Argument '${path}' passed to capability '${capabilityId}' contains a circular reference. ` +
        'Circular references are not supported by the AppHost transport.');
}
// ============================================================================
// Handle
// ============================================================================
/**
 * A typed handle to a .NET object in the ATS system.
 * Handles are opaque references that can be passed to capabilities.
 *
 * @typeParam T - The ATS type ID (e.g., "Aspire.Hosting/IDistributedApplicationBuilder")
 */
class Handle {
    $handle;
    $type;
    constructor(marshalled) {
        this.$handle = marshalled.$handle;
        this.$type = marshalled.$type;
    }
    /** Serialize for JSON-RPC transport */
    toJSON() {
        return {
            $handle: this.$handle,
            $type: this.$type
        };
    }
    /** String representation for debugging */
    toString() {
        return `Handle<${this.$type}>(${this.$handle})`;
    }
}
exports.Handle = Handle;
// ============================================================================
// CancellationToken
// ============================================================================
/**
 * Represents a transport-safe cancellation token value for the generated SDK.
 *
 * Use a plain {@link AbortSignal} when you create cancellation in user code.
 * Generated APIs accept either an {@link AbortSignal} or a {@link CancellationToken}.
 *
 * Values returned from generated callbacks and context/property getters are
 * {@link CancellationToken} instances because they may reference remote
 * cancellation token handles received from the AppHost.
 *
 * @example
 * ```typescript
 * const controller = new AbortController();
 * await connectionStringExpression.getValue(controller.signal);
 * ```
 *
 * @example
 * ```typescript
 * const cancellationToken = await context.cancellationToken.get();
 * const connectionStringExpression = await db.uriExpression.get();
 * const connectionString = await connectionStringExpression.getValue(cancellationToken);
 * ```
 */
const cancellationTokenState = new WeakMap();
class CancellationToken {
    constructor(value) {
        const state = {};
        if (typeof value === 'string') {
            state.remoteTokenId = value;
        }
        else if (isAbortSignal(value)) {
            state.signal = value;
        }
        cancellationTokenState.set(this, state);
    }
    /**
     * Creates a cancellation token from a local {@link AbortSignal}.
     */
    toJSON() {
        return cancellationTokenState.get(this)?.remoteTokenId;
    }
    register(client) {
        const state = cancellationTokenState.get(this);
        if (state?.remoteTokenId !== undefined) {
            return state.remoteTokenId;
        }
        return client
            ? registerCancellation(client, state?.signal)
            : registerCancellation(state?.signal);
    }
    /**
     * Creates transport-safe cancellation token values for the generated SDK.
     */
    static from(signal) {
        return new CancellationToken(signal);
    }
    /**
     * Creates a cancellation token from a transport value.
     * Generated code uses this to materialize values that come from the AppHost.
     */
    static fromValue(value) {
        if (isCancellationTokenLike(value)) {
            return value;
        }
        if (typeof value === 'string') {
            return new CancellationToken(value);
        }
        if (isAbortSignal(value)) {
            return new CancellationToken(value);
        }
        return new CancellationToken();
    }
}
exports.CancellationToken = CancellationToken;
/**
 * Registry of handle wrapper factories by type ID.
 * Generated code registers wrapper classes here so callback handles can be properly typed.
 */
const handleWrapperRegistry = new Map();
/**
 * Register a wrapper factory for a type ID.
 * Called by generated code to register wrapper classes.
 */
function registerHandleWrapper(typeId, factory) {
    handleWrapperRegistry.set(typeId, factory);
}
/**
 * Checks if a value is a marshalled handle and wraps it appropriately.
 * Uses the wrapper registry to create typed wrapper instances when available.
 *
 * @param value - The value to potentially wrap
 * @param client - Optional client for creating typed wrapper instances
 */
function wrapIfHandle(value, client) {
    if (isMarshalledHandle(value)) {
        const handle = new Handle(value);
        const typeId = value.$type;
        // Try to find a registered wrapper factory for this type
        if (typeId && client) {
            const factory = handleWrapperRegistry.get(typeId);
            if (factory) {
                return factory(handle, client);
            }
        }
        return handle;
    }
    if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
            value[i] = wrapIfHandle(value[i], client);
        }
        return value;
    }
    if (isPlainObject(value)) {
        for (const [key, nestedValue] of Object.entries(value)) {
            value[key] = wrapIfHandle(nestedValue, client);
        }
    }
    return value;
}
// ============================================================================
// Capability Error
// ============================================================================
/**
 * Error thrown when an ATS capability invocation fails.
 */
class CapabilityError extends Error {
    error;
    constructor(
    /** The structured error from the server */
    error) {
        super(error.message);
        this.error = error;
        this.name = 'CapabilityError';
        Object.setPrototypeOf(this, new.target.prototype);
    }
    /** Machine-readable error code */
    get code() {
        return this.error.code;
    }
    /** The capability that failed (if applicable) */
    get capability() {
        return this.error.capability;
    }
}
exports.CapabilityError = CapabilityError;
/**
 * Error thrown when the AppHost script uses the generated SDK incorrectly.
 */
class AppHostUsageError extends Error {
    constructor(message) {
        super(message);
        this.name = 'AppHostUsageError';
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
exports.AppHostUsageError = AppHostUsageError;
function isPromiseLike(value) {
    return (value !== null &&
        (typeof value === 'object' || typeof value === 'function') &&
        'then' in value &&
        typeof value.then === 'function');
}
function validateCapabilityArgs(capabilityId, args) {
    if (!args) {
        return;
    }
    const validateValue = (value, path, ancestors) => {
        if (value === null || value === undefined) {
            return;
        }
        if (isPromiseLike(value)) {
            throw new AppHostUsageError(`Argument '${path}' passed to capability '${capabilityId}' is a Promise-like value. ` +
                `This usually means an async builder call was not awaited. ` +
                `Did you forget 'await' on a call like builder.addPostgres(...) or resource.addDatabase(...)?`);
        }
        if (typeof value !== 'object') {
            return;
        }
        if (ancestors.has(value)) {
            throw createCircularReferenceError(capabilityId, path);
        }
        ancestors.add(value);
        try {
            if (Array.isArray(value)) {
                for (let i = 0; i < value.length; i++) {
                    validateValue(value[i], `${path}[${i}]`, ancestors);
                }
                return;
            }
            for (const [key, nestedValue] of Object.entries(value)) {
                validateValue(nestedValue, `${path}.${key}`, ancestors);
            }
        }
        finally {
            ancestors.delete(value);
        }
    };
    for (const [key, value] of Object.entries(args)) {
        validateValue(value, key, new Set());
    }
}
// ============================================================================
// Callback Registry
// ============================================================================
const callbackRegistry = new Map();
let callbackIdCounter = 0;
/**
 * Register a callback function that can be invoked from the .NET side.
 * Returns a callback ID that should be passed to methods accepting callbacks.
 *
 * .NET passes arguments as an object with positional keys: `{ p0: value0, p1: value1, ... }`
 * This function automatically extracts positional parameters and wraps handles.
 *
 * @example
 * // Single parameter callback
 * const id = registerCallback((ctx) => console.log(ctx));
 * // .NET sends: { p0: { $handle: "...", $type: "..." } }
 * // Callback receives: Handle instance
 *
 * @example
 * // Multi-parameter callback
 * const id = registerCallback((a, b) => console.log(a, b));
 * // .NET sends: { p0: "hello", p1: 42 }
 * // Callback receives: "hello", 42
 */
function registerCallback(callback) {
    const callbackId = `callback_${++callbackIdCounter}_${Date.now()}`;
    // Wrap the callback to handle .NET's positional argument format
    const wrapper = async (args, client) => {
        // .NET sends args as object { p0: value0, p1: value1, ... }
        if (args && typeof args === 'object' && !Array.isArray(args)) {
            const argObj = args;
            const argArray = [];
            // Extract positional parameters (p0, p1, p2, ...)
            for (let i = 0;; i++) {
                const key = `p${i}`;
                if (key in argObj) {
                    argArray.push(wrapIfHandle(argObj[key], client));
                }
                else {
                    break;
                }
            }
            if (argArray.length > 0) {
                // Spread positional arguments to callback
                const result = await callback(...argArray);
                // DTO writeback protocol: when a void callback returns undefined, we
                // return the original args object so the .NET host can detect property
                // mutations made by the callback and apply them back to the original
                // C# DTO objects. DTO args are plain JS objects (not Handle wrappers),
                // so any property changes the callback made are reflected in args.
                //
                // Non-void callbacks (result !== undefined) return their actual result.
                // The .NET side only activates writeback for void delegates whose
                // parameters include [AspireDto] types — all other cases discard the
                // returned args object, so the extra wire payload is harmless.
                //
                // IMPORTANT: callbacks that intentionally return undefined will also
                // trigger this path. For non-void delegate types, the C# proxy uses
                // a result-unmarshalling path (not writeback), so returning args will
                // cause an unmarshal error. Void callbacks should never return a
                // meaningful value; non-void callbacks should always return one.
                return result !== undefined ? result : args;
            }
            // No positional params found — nothing to write back
            return await callback();
        }
        // Null/undefined - call with no args
        if (args === null || args === undefined) {
            return await callback();
        }
        // Primitive value - pass as single arg (shouldn't happen with current protocol)
        return await callback(wrapIfHandle(args, client));
    };
    callbackRegistry.set(callbackId, wrapper);
    return callbackId;
}
/**
 * Unregister a callback by its ID.
 */
function unregisterCallback(callbackId) {
    return callbackRegistry.delete(callbackId);
}
/**
 * Get the number of registered callbacks.
 */
function getCallbackCount() {
    return callbackRegistry.size;
}
// ============================================================================
// Cancellation Token Registry
// ============================================================================
/**
 * Registry for cancellation tokens.
 * Maps cancellation IDs to cleanup functions.
 */
const cancellationRegistry = new Map();
let cancellationIdCounter = 0;
const connectedClients = new Set();
function resolveCancellationClient(client) {
    if (client) {
        return client;
    }
    if (connectedClients.size === 1) {
        return connectedClients.values().next().value;
    }
    if (connectedClients.size === 0) {
        throw new Error('registerCancellation(signal) requires a connected AspireClient. ' +
            'Pass the client explicitly or connect the client first.');
    }
    throw new Error('registerCancellation(signal) is ambiguous when multiple AspireClient instances are connected. ' +
        'Pass the client explicitly.');
}
function isAspireClientLike(value) {
    if (!value || typeof value !== 'object') {
        return false;
    }
    const candidate = value;
    return typeof candidate.invokeCapability === 'function'
        && typeof candidate.cancelToken === 'function'
        && typeof candidate.connected === 'boolean';
}
function registerCancellation(clientOrSignalOrToken, maybeSignalOrToken) {
    const client = isAspireClientLike(clientOrSignalOrToken) ? clientOrSignalOrToken : undefined;
    const signalOrToken = client
        ? maybeSignalOrToken
        : clientOrSignalOrToken;
    if (!signalOrToken) {
        return undefined;
    }
    if (isCancellationTokenLike(signalOrToken)) {
        return signalOrToken.register(client);
    }
    const signal = signalOrToken;
    const cancellationClient = resolveCancellationClient(client);
    if (signal.aborted) {
        throw createAbortError('The operation was aborted before it was sent to the AppHost.');
    }
    const cancellationId = `ct_${++cancellationIdCounter}_${Date.now()}`;
    // Set up the abort listener
    const onAbort = () => {
        // Send cancel request to host
        if (cancellationClient.connected) {
            cancellationClient.cancelToken(cancellationId).catch(() => {
                // Ignore errors - the operation may have already completed
            });
        }
        // Clean up the listener
        cancellationRegistry.delete(cancellationId);
    };
    // Listen for abort
    signal.addEventListener('abort', onAbort, { once: true });
    // Store cleanup function
    cancellationRegistry.set(cancellationId, () => {
        signal.removeEventListener('abort', onAbort);
    });
    return cancellationId;
}
async function marshalTransportValue(value, client, cancellationIds, capabilityId, path = 'args', ancestors = new Set()) {
    if (value === null || value === undefined || typeof value !== 'object') {
        return value;
    }
    if (isCancellationTokenLike(value)) {
        const cancellationId = value.register(client);
        if (cancellationId !== undefined) {
            cancellationIds.push(cancellationId);
        }
        return cancellationId;
    }
    if (ancestors.has(value)) {
        throw createCircularReferenceError(capabilityId, path);
    }
    const nextAncestors = new Set(ancestors);
    nextAncestors.add(value);
    if (hasTransportValue(value)) {
        return await marshalTransportValue(await value.toTransportValue(), client, cancellationIds, capabilityId, path, nextAncestors);
    }
    if (Array.isArray(value)) {
        return await Promise.all(value.map((item, index) => marshalTransportValue(item, client, cancellationIds, capabilityId, `${path}[${index}]`, nextAncestors)));
    }
    if (isPlainObject(value)) {
        const entries = await Promise.all(Object.entries(value).map(async ([key, nestedValue]) => [key, await marshalTransportValue(nestedValue, client, cancellationIds, capabilityId, `${path}.${key}`, nextAncestors)]));
        return Object.fromEntries(entries);
    }
    return value;
}
/**
 * Unregister a cancellation token by its ID.
 * Call this when the operation completes to clean up resources.
 *
 * @param cancellationId - The cancellation ID to unregister
 */
function unregisterCancellation(cancellationId) {
    if (!cancellationId) {
        return;
    }
    const cleanup = cancellationRegistry.get(cancellationId);
    if (cleanup) {
        cleanup();
        cancellationRegistry.delete(cancellationId);
    }
}
// ============================================================================
// AspireClient (JSON-RPC Connection)
// ============================================================================
/**
 * Client for connecting to the Aspire AppHost via socket/named pipe.
 */
class AspireClient {
    socketPath;
    connection = null;
    socket = null;
    disconnectCallbacks = [];
    _pendingCalls = 0;
    _connectPromise = null;
    _disconnectNotified = false;
    _pendingPromises = new Set();
    _rejectedErrors = new Set();
    throwOnPendingRejections = true;
    constructor(socketPath) {
        this.socketPath = socketPath;
    }
    trackPromise(promise) {
        this._pendingPromises.add(promise);
        // Remove on both resolve and reject. The reject handler swallows the
        // error to prevent Node.js unhandled-rejection crashes.
        //
        // When throwOnPendingRejections is true (default), rejection errors are
        // eagerly collected so that flushPendingPromises can re-throw them even
        // if the promise settles before flush is called.
        //
        // Limitation: JavaScript provides no way to detect whether a rejection
        // was already observed by the caller (e.g., try { await p } catch {}).
        // The .then() reject handler fires regardless. This means user-caught
        // rejections will also be re-thrown by build(). We accept this tradeoff
        // because the common case — an un-awaited chain fails silently — should
        // fail loud. The uncommon case (catch an error from an un-awaited chain,
        // then continue to build) can opt out with:
        //   createBuilder({ throwOnPendingRejections: false })
        promise.then(() => this._pendingPromises.delete(promise), (err) => {
            this._pendingPromises.delete(promise);
            if (this.throwOnPendingRejections) {
                this._rejectedErrors.add(err);
            }
        });
    }
    async flushPendingPromises() {
        if (this._pendingPromises.size > 0) {
            console.warn(`Flushing ${this._pendingPromises.size} pending promise(s). Consider awaiting fluent calls to avoid implicit flushing.`);
            // Snapshot the current set before awaiting. Promises tracked after
            // flush starts (e.g. by .then() callbacks or the build PromiseImpl
            // constructor) are excluded. This prevents deadlocks where a tracked
            // promise depends on flush completing.
            const pending = [...this._pendingPromises];
            await Promise.allSettled(pending);
        }
        if (this._rejectedErrors.size > 0) {
            const errors = [...this._rejectedErrors];
            this._rejectedErrors.clear();
            throw new AggregateError(errors, 'One or more unawaited fluent calls failed');
        }
    }
    /**
     * Register a callback to be called when the connection is lost
     */
    onDisconnect(callback) {
        this.disconnectCallbacks.push(callback);
    }
    notifyDisconnect() {
        if (this._disconnectNotified) {
            return;
        }
        this._disconnectNotified = true;
        for (const callback of this.disconnectCallbacks) {
            try {
                callback();
            }
            catch {
                // Ignore callback errors
            }
        }
    }
    connect(timeoutMs = 5000) {
        if (this.connected) {
            return Promise.resolve();
        }
        if (this._connectPromise) {
            return this._connectPromise;
        }
        this._disconnectNotified = false;
        // On Windows, use named pipes; on Unix, use Unix domain sockets
        const isWindows = process.platform === 'win32';
        const pipePath = isWindows ? `\\\\.\\pipe\\${this.socketPath}` : this.socketPath;
        this._connectPromise = new Promise((resolve, reject) => {
            const socket = net.createConnection(pipePath);
            this.socket = socket;
            let settled = false;
            const cleanupPendingListeners = () => {
                socket.removeListener('connect', onConnect);
                socket.removeListener('error', onPendingError);
                socket.removeListener('close', onPendingClose);
            };
            const failConnect = (error) => {
                if (settled) {
                    return;
                }
                settled = true;
                clearTimeout(timeout);
                cleanupPendingListeners();
                this._connectPromise = null;
                if (this.socket === socket) {
                    this.socket = null;
                }
                if (!socket.destroyed) {
                    socket.destroy();
                }
                reject(error);
            };
            const onConnectedSocketError = (error) => {
                console.error('Socket error:', error);
            };
            const onConnectedSocketClose = () => {
                socket.removeListener('error', onConnectedSocketError);
                if (this.socket && this.socket !== socket) {
                    return;
                }
                const connection = this.connection;
                this.connection = null;
                this._connectPromise = null;
                if (this.socket === socket) {
                    this.socket = null;
                }
                connectedClients.delete(this);
                try {
                    connection?.dispose();
                }
                catch {
                    // Ignore connection disposal errors during shutdown.
                }
                this.notifyDisconnect();
            };
            const onPendingError = (error) => {
                failConnect(error);
            };
            const onPendingClose = () => {
                failConnect(new Error('Connection closed before JSON-RPC was established'));
            };
            const onConnect = async () => {
                if (settled) {
                    return;
                }
                clearTimeout(timeout);
                cleanupPendingListeners();
                try {
                    const reader = new rpc.SocketMessageReader(socket);
                    const writer = new rpc.SocketMessageWriter(socket);
                    this.connection = rpc.createMessageConnection(reader, writer);
                    this.connection.onClose(() => {
                        this.connection = null;
                    });
                    this.connection.onError((err) => console.error('JsonRpc connection error:', err));
                    // Handle callback invocations from the .NET side
                    this.connection.onRequest('invokeCallback', async (callbackId, args) => {
                        const callback = callbackRegistry.get(callbackId);
                        if (!callback) {
                            throw new Error(`Callback not found: ${callbackId}`);
                        }
                        try {
                            // The registered wrapper handles arg unpacking and handle wrapping
                            // Pass this client so handles can be wrapped with typed wrapper classes
                            return await Promise.resolve(callback(args, this));
                        }
                        catch (error) {
                            const message = error instanceof Error ? error.message : String(error);
                            throw new Error(`Callback execution failed: ${message}`);
                        }
                    });
                    socket.on('error', onConnectedSocketError);
                    socket.on('close', onConnectedSocketClose);
                    const authToken = process.env.ASPIRE_REMOTE_APPHOST_TOKEN;
                    if (!authToken) {
                        throw new Error('ASPIRE_REMOTE_APPHOST_TOKEN environment variable is not set.');
                    }
                    this.connection.listen();
                    const authenticated = await this.connection.sendRequest('authenticate', authToken);
                    if (!authenticated) {
                        throw new Error('Failed to authenticate to the AppHost server.');
                    }
                    connectedClients.add(this);
                    this._connectPromise = null;
                    settled = true;
                    resolve();
                }
                catch (error) {
                    failConnect(error instanceof Error ? error : new Error(String(error)));
                }
            };
            const timeout = setTimeout(() => {
                failConnect(new Error('Connection timeout'));
            }, timeoutMs);
            socket.once('error', onPendingError);
            socket.once('close', onPendingClose);
            socket.once('connect', onConnect);
        });
        return this._connectPromise;
    }
    ping() {
        if (!this.connection)
            return Promise.reject(new Error('Not connected to AppHost'));
        return this.connection.sendRequest('ping');
    }
    /**
     * Cancel a CancellationToken by its ID.
     * Called when an AbortSignal is aborted.
     *
     * @param tokenId - The token ID to cancel
     * @returns True if the token was found and cancelled, false otherwise
     */
    cancelToken(tokenId) {
        if (!this.connection)
            return Promise.reject(new Error('Not connected to AppHost'));
        return this.connection.sendRequest('cancelToken', tokenId);
    }
    /**
     * Invoke an ATS capability by ID.
     *
     * Capabilities are operations exposed by [AspireExport] attributes.
     * Results are automatically wrapped in Handle objects when applicable.
     *
     * @param capabilityId - The capability ID (e.g., "Aspire.Hosting/createBuilder")
     * @param args - Arguments to pass to the capability
     * @returns The capability result, wrapped as Handle if it's a handle type
     * @throws CapabilityError if the capability fails
     */
    async invokeCapability(capabilityId, args) {
        if (!this.connection) {
            throw new Error('Not connected to AppHost');
        }
        validateCapabilityArgs(capabilityId, args);
        const cancellationIds = [];
        try {
            const rpcArgs = await marshalTransportValue(args ?? null, this, cancellationIds, capabilityId);
            // Ref counting: The vscode-jsonrpc socket keeps Node's event loop alive.
            // We ref() during RPC calls so the process doesn't exit mid-call, and
            // unref() when idle so the process can exit naturally after all work completes.
            if (this._pendingCalls === 0) {
                this.socket?.ref();
            }
            this._pendingCalls++;
            try {
                const result = await this.connection.sendRequest('invokeCapability', capabilityId, rpcArgs);
                // Check for structured error response
                if (isAtsError(result)) {
                    throw new CapabilityError(result.$error);
                }
                // Wrap handles automatically
                return wrapIfHandle(result, this);
            }
            finally {
                this._pendingCalls--;
                if (this._pendingCalls === 0) {
                    this.socket?.unref();
                }
            }
        }
        finally {
            for (const cancellationId of cancellationIds) {
                unregisterCancellation(cancellationId);
            }
        }
    }
    disconnect() {
        const connection = this.connection;
        const socket = this.socket;
        this.connection = null;
        this.socket = null;
        this._connectPromise = null;
        connectedClients.delete(this);
        try {
            connection?.dispose();
        }
        catch {
            // Ignore connection disposal errors during shutdown.
        }
        if (socket && !socket.destroyed) {
            socket.end();
            socket.destroy();
        }
    }
    get connected() {
        return this.connection !== null && this.socket !== null;
    }
}
exports.AspireClient = AspireClient;
