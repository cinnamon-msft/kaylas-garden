"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AspireDict = exports.AspireList = exports.ResourceBuilderBase = exports.ReferenceExpression = exports.wrapIfHandle = exports.isAtsError = exports.isMarshalledHandle = exports.AtsErrorCodes = exports.unregisterCancellation = exports.registerCancellation = exports.unregisterCallback = exports.registerCallback = exports.CancellationToken = exports.CapabilityError = exports.AspireClient = exports.Handle = void 0;
exports.refExpr = refExpr;
// base.ts - Core Aspire types: base classes, ReferenceExpression
const transport_js_1 = require("./transport.js");
// Re-export transport types for convenience
var transport_js_2 = require("./transport.js");
Object.defineProperty(exports, "Handle", { enumerable: true, get: function () { return transport_js_2.Handle; } });
Object.defineProperty(exports, "AspireClient", { enumerable: true, get: function () { return transport_js_2.AspireClient; } });
Object.defineProperty(exports, "CapabilityError", { enumerable: true, get: function () { return transport_js_2.CapabilityError; } });
Object.defineProperty(exports, "CancellationToken", { enumerable: true, get: function () { return transport_js_2.CancellationToken; } });
Object.defineProperty(exports, "registerCallback", { enumerable: true, get: function () { return transport_js_2.registerCallback; } });
Object.defineProperty(exports, "unregisterCallback", { enumerable: true, get: function () { return transport_js_2.unregisterCallback; } });
Object.defineProperty(exports, "registerCancellation", { enumerable: true, get: function () { return transport_js_2.registerCancellation; } });
Object.defineProperty(exports, "unregisterCancellation", { enumerable: true, get: function () { return transport_js_2.unregisterCancellation; } });
var transport_js_3 = require("./transport.js");
Object.defineProperty(exports, "AtsErrorCodes", { enumerable: true, get: function () { return transport_js_3.AtsErrorCodes; } });
Object.defineProperty(exports, "isMarshalledHandle", { enumerable: true, get: function () { return transport_js_3.isMarshalledHandle; } });
Object.defineProperty(exports, "isAtsError", { enumerable: true, get: function () { return transport_js_3.isAtsError; } });
Object.defineProperty(exports, "wrapIfHandle", { enumerable: true, get: function () { return transport_js_3.wrapIfHandle; } });
// ============================================================================
// Reference Expression
// ============================================================================
/**
 * Represents a reference expression that can be passed to capabilities.
 *
 * Reference expressions are serialized in the protocol as:
 * ```json
 * {
 *   "$expr": {
 *     "format": "redis://{0}:{1}",
 *     "valueProviders": [
 *       { "$handle": "Aspire.Hosting.ApplicationModel/EndpointReference:1" },
 *       { "$handle": "Aspire.Hosting.ApplicationModel/EndpointReference:2" }
 *     ]
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * const redis = await builder.addRedis("cache");
 * const endpoint = await redis.getEndpoint("tcp");
 *
 * // Create a reference expression
 * const expr = refExpr`redis://${endpoint}:6379`;
 *
 * // Use it in an environment variable
 * await api.withEnvironment("REDIS_URL", expr);
 * ```
 */
const referenceExpressionState = new WeakMap();
class ReferenceExpression {
    constructor(handleOrFormatOrCondition, clientOrValueProvidersOrMatchValue, whenTrueOrWhenFalse, whenFalse) {
        const state = {};
        if (typeof handleOrFormatOrCondition === 'string') {
            state.format = handleOrFormatOrCondition;
            state.valueProviders = clientOrValueProvidersOrMatchValue;
        }
        else if (isHandleLike(handleOrFormatOrCondition)) {
            state.handle = handleOrFormatOrCondition;
            state.client = clientOrValueProvidersOrMatchValue;
        }
        else {
            state.condition = handleOrFormatOrCondition;
            state.matchValue = clientOrValueProvidersOrMatchValue ?? 'True';
            state.whenTrue = whenTrueOrWhenFalse;
            state.whenFalse = whenFalse;
        }
        referenceExpressionState.set(this, state);
    }
    /**
     * Gets whether this reference expression is conditional.
     */
    get isConditional() {
        return referenceExpressionState.get(this)?.condition !== undefined;
    }
    /**
     * Creates a reference expression from a tagged template literal.
     *
     * @param strings - The template literal string parts
     * @param values - The interpolated values (handles to value providers)
     * @returns A ReferenceExpression instance
     */
    /**
     * Serializes the reference expression for JSON-RPC transport.
     * In expression mode, uses the $expr format with format + valueProviders.
     * In conditional mode, uses the $expr format with condition + whenTrue + whenFalse.
     * In handle mode, delegates to the handle's serialization.
     */
    toJSON() {
        const state = referenceExpressionState.get(this);
        if (state.handle) {
            return state.handle.toJSON();
        }
        if (this.isConditional) {
            return {
                $expr: {
                    condition: extractHandleForExpr(state.condition),
                    whenTrue: state.whenTrue.toJSON(),
                    whenFalse: state.whenFalse.toJSON(),
                    matchValue: state.matchValue
                }
            };
        }
        return {
            $expr: {
                format: state.format,
                valueProviders: state.valueProviders && state.valueProviders.length > 0 ? state.valueProviders : undefined
            }
        };
    }
    /**
     * Resolves the expression to its string value on the server.
     * Only available on server-returned ReferenceExpression instances (handle mode).
     *
     * @param cancellationToken - Optional AbortSignal or CancellationToken for cancellation support
     * @returns The resolved string value, or null if the expression resolves to null
     */
    async getValue(cancellationToken) {
        const state = referenceExpressionState.get(this);
        if (!state.handle || !state.client) {
            throw new Error('getValue is only available on server-returned ReferenceExpression instances');
        }
        const cancellationTokenId = (0, transport_js_1.registerCancellation)(state.client, cancellationToken);
        try {
            const rpcArgs = { context: state.handle };
            if (cancellationTokenId !== undefined)
                rpcArgs.cancellationToken = cancellationTokenId;
            return await state.client.invokeCapability('Aspire.Hosting.ApplicationModel/getValue', rpcArgs);
        }
        finally {
            (0, transport_js_1.unregisterCancellation)(cancellationTokenId);
        }
    }
    /**
     * String representation for debugging.
     */
    toString() {
        const state = referenceExpressionState.get(this);
        if (state.handle) {
            return `ReferenceExpression(handle)`;
        }
        if (this.isConditional) {
            return `ReferenceExpression(conditional)`;
        }
        return `ReferenceExpression(${state.format})`;
    }
    static create(strings, ...values) {
        return createReferenceExpression(strings, ...values);
    }
    static createConditional(condition, matchValueOrWhenTrue, whenTrueOrWhenFalse, whenFalse) {
        if (typeof matchValueOrWhenTrue === 'string') {
            return createConditionalReferenceExpression(condition, matchValueOrWhenTrue, whenTrueOrWhenFalse, whenFalse);
        }
        return createConditionalReferenceExpression(condition, matchValueOrWhenTrue, whenTrueOrWhenFalse);
    }
}
exports.ReferenceExpression = ReferenceExpression;
function createReferenceExpression(strings, ...values) {
    let format = '';
    for (let i = 0; i < strings.length; i++) {
        format += strings[i];
        if (i < values.length) {
            format += `{${i}}`;
        }
    }
    const valueProviders = values.map(extractHandleForExpr);
    return new ReferenceExpression(format, valueProviders);
}
function createConditionalReferenceExpression(condition, matchValueOrWhenTrue, whenTrueOrWhenFalse, whenFalse) {
    if (typeof matchValueOrWhenTrue === 'string') {
        return new ReferenceExpression(condition, matchValueOrWhenTrue, whenTrueOrWhenFalse, whenFalse);
    }
    return new ReferenceExpression(condition, 'True', matchValueOrWhenTrue, whenTrueOrWhenFalse);
}
(0, transport_js_1.registerHandleWrapper)('Aspire.Hosting/Aspire.Hosting.ApplicationModel.ReferenceExpression', (handle, client) => new ReferenceExpression(handle, client));
/**
 * Extracts a value for use in reference expressions.
 * Supports handles (objects) and string literals.
 * @internal
 */
function extractHandleForExpr(value) {
    if (value === null || value === undefined) {
        throw new Error('Cannot use null or undefined in reference expression');
    }
    // String literals - include directly in the expression
    if (typeof value === 'string') {
        return value;
    }
    // Number literals - convert to string
    if (typeof value === 'number') {
        return String(value);
    }
    // Handle objects - get their JSON representation
    if (isHandleLike(value)) {
        return value.toJSON();
    }
    // Objects with marshalled expression/handle payloads
    if (typeof value === 'object' && value !== null && ('$handle' in value || '$expr' in value)) {
        return value;
    }
    // Objects with toJSON that returns a marshalled expression or handle
    if (typeof value === 'object' && value !== null && 'toJSON' in value && typeof value.toJSON === 'function') {
        const json = value.toJSON();
        if (json && typeof json === 'object' && ('$handle' in json || '$expr' in json)) {
            return json;
        }
    }
    throw new Error(`Cannot use value of type ${typeof value} in reference expression. ` +
        `Expected a Handle, string, or number.`);
}
function isHandleLike(value) {
    return (value !== null &&
        typeof value === 'object' &&
        '$handle' in value &&
        typeof value.$handle === 'string' &&
        '$type' in value &&
        typeof value.$type === 'string' &&
        'toJSON' in value &&
        typeof value.toJSON === 'function');
}
/**
 * Tagged template function for creating reference expressions.
 *
 * Use this to create dynamic expressions that reference endpoints, parameters, and other
 * value providers. The expression is evaluated at runtime by Aspire.
 *
 * @example
 * ```typescript
 * const redis = await builder.addRedis("cache");
 * const endpoint = await redis.getEndpoint("tcp");
 *
 * // Create a reference expression using the tagged template
 * const expr = refExpr`redis://${endpoint}:6379`;
 *
 * // Use it in an environment variable
 * await api.withEnvironment("REDIS_URL", expr);
 * ```
 */
function refExpr(strings, ...values) {
    return ReferenceExpression.create(strings, ...values);
}
/**
 * Base class for resource builders (e.g., RedisBuilder, ContainerBuilder).
 * Provides handle management and JSON serialization.
 */
class ResourceBuilderBase {
    _handle;
    _client;
    constructor(_handle, _client) {
        this._handle = _handle;
        this._client = _client;
    }
    toJSON() { return this._handle.toJSON(); }
}
exports.ResourceBuilderBase = ResourceBuilderBase;
class AspireListImpl {
    _handleOrContext;
    _client;
    _typeId;
    _getterCapabilityId;
    _resolvedHandle;
    _resolvePromise;
    constructor(_handleOrContext, _client, _typeId, _getterCapabilityId) {
        this._handleOrContext = _handleOrContext;
        this._client = _client;
        this._typeId = _typeId;
        this._getterCapabilityId = _getterCapabilityId;
        // If no getter capability, the handle is already the list handle
        if (!_getterCapabilityId) {
            this._resolvedHandle = _handleOrContext;
        }
    }
    /**
     * Ensures we have the actual list handle by calling the getter if needed.
     */
    async _ensureHandle() {
        if (this._resolvedHandle) {
            return this._resolvedHandle;
        }
        if (this._resolvePromise) {
            return this._resolvePromise;
        }
        // Call the getter capability to get the actual list handle
        this._resolvePromise = (async () => {
            const result = await this._client.invokeCapability(this._getterCapabilityId, {
                context: this._handleOrContext
            });
            this._resolvedHandle = result;
            return this._resolvedHandle;
        })();
        return this._resolvePromise;
    }
    /**
     * Gets the number of elements in the list.
     */
    async count() {
        const handle = await this._ensureHandle();
        return await this._client.invokeCapability('Aspire.Hosting/List.length', {
            list: handle
        });
    }
    /**
     * Gets the element at the specified index.
     */
    async get(index) {
        const handle = await this._ensureHandle();
        return await this._client.invokeCapability('Aspire.Hosting/List.get', {
            list: handle,
            index
        });
    }
    /**
     * Adds an element to the end of the list.
     */
    async add(item) {
        const handle = await this._ensureHandle();
        await this._client.invokeCapability('Aspire.Hosting/List.add', {
            list: handle,
            item
        });
    }
    /**
     * Removes the element at the specified index.
     */
    async removeAt(index) {
        const handle = await this._ensureHandle();
        await this._client.invokeCapability('Aspire.Hosting/List.removeAt', {
            list: handle,
            index
        });
    }
    /**
     * Clears all elements from the list.
     */
    async clear() {
        const handle = await this._ensureHandle();
        await this._client.invokeCapability('Aspire.Hosting/List.clear', {
            list: handle
        });
    }
    /**
     * Converts the list to an array (creates a copy).
     */
    async toArray() {
        const handle = await this._ensureHandle();
        return await this._client.invokeCapability('Aspire.Hosting/List.toArray', {
            list: handle
        });
    }
    async toTransportValue() {
        const handle = await this._ensureHandle();
        return handle.toJSON();
    }
    toJSON() {
        if (!this._resolvedHandle) {
            throw new Error('AspireList must be resolved before it can be serialized directly. ' +
                'Pass it to generated SDK methods instead of calling JSON.stringify directly.');
        }
        return this._resolvedHandle.toJSON();
    }
}
exports.AspireList = AspireListImpl;
class AspireDictImpl {
    _handleOrContext;
    _client;
    _typeId;
    _getterCapabilityId;
    _resolvedHandle;
    _resolvePromise;
    constructor(_handleOrContext, _client, _typeId, _getterCapabilityId) {
        this._handleOrContext = _handleOrContext;
        this._client = _client;
        this._typeId = _typeId;
        this._getterCapabilityId = _getterCapabilityId;
        // If no getter capability, the handle is already the dictionary handle
        if (!_getterCapabilityId) {
            this._resolvedHandle = _handleOrContext;
        }
    }
    /**
     * Ensures we have the actual dictionary handle by calling the getter if needed.
     */
    async _ensureHandle() {
        if (this._resolvedHandle) {
            return this._resolvedHandle;
        }
        if (this._resolvePromise) {
            return this._resolvePromise;
        }
        // Call the getter capability to get the actual dictionary handle
        this._resolvePromise = (async () => {
            const result = await this._client.invokeCapability(this._getterCapabilityId, {
                context: this._handleOrContext
            });
            this._resolvedHandle = result;
            return this._resolvedHandle;
        })();
        return this._resolvePromise;
    }
    /**
     * Gets the number of key-value pairs in the dictionary.
     */
    async count() {
        const handle = await this._ensureHandle();
        return await this._client.invokeCapability('Aspire.Hosting/Dict.count', {
            dict: handle
        });
    }
    /**
     * Gets the value associated with the specified key.
     * @throws If the key is not found.
     */
    async get(key) {
        const handle = await this._ensureHandle();
        return await this._client.invokeCapability('Aspire.Hosting/Dict.get', {
            dict: handle,
            key
        });
    }
    /**
     * Sets the value for the specified key.
     */
    async set(key, value) {
        const handle = await this._ensureHandle();
        await this._client.invokeCapability('Aspire.Hosting/Dict.set', {
            dict: handle,
            key,
            value
        });
    }
    /**
     * Determines whether the dictionary contains the specified key.
     */
    async containsKey(key) {
        const handle = await this._ensureHandle();
        return await this._client.invokeCapability('Aspire.Hosting/Dict.has', {
            dict: handle,
            key
        });
    }
    /**
     * Removes the value with the specified key.
     * @returns True if the element was removed; false if the key was not found.
     */
    async remove(key) {
        const handle = await this._ensureHandle();
        return await this._client.invokeCapability('Aspire.Hosting/Dict.remove', {
            dict: handle,
            key
        });
    }
    /**
     * Clears all key-value pairs from the dictionary.
     */
    async clear() {
        const handle = await this._ensureHandle();
        await this._client.invokeCapability('Aspire.Hosting/Dict.clear', {
            dict: handle
        });
    }
    /**
     * Gets all keys in the dictionary.
     */
    async keys() {
        const handle = await this._ensureHandle();
        return await this._client.invokeCapability('Aspire.Hosting/Dict.keys', {
            dict: handle
        });
    }
    /**
     * Gets all values in the dictionary.
     */
    async values() {
        const handle = await this._ensureHandle();
        return await this._client.invokeCapability('Aspire.Hosting/Dict.values', {
            dict: handle
        });
    }
    /**
     * Converts the dictionary to a plain object (creates a copy).
     * Only works when K is string.
     */
    async toObject() {
        const handle = await this._ensureHandle();
        return await this._client.invokeCapability('Aspire.Hosting/Dict.toObject', {
            dict: handle
        });
    }
    async toTransportValue() {
        const handle = await this._ensureHandle();
        return handle.toJSON();
    }
    toJSON() {
        if (!this._resolvedHandle) {
            throw new Error('AspireDict must be resolved before it can be serialized directly. ' +
                'Pass it to generated SDK methods instead of calling JSON.stringify directly.');
        }
        return this._resolvedHandle.toJSON();
    }
}
exports.AspireDict = AspireDictImpl;
