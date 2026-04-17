import { NodeSDK } from '@opentelemetry/sdk-node'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc'
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc'
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-grpc'
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics'
import {
  BatchLogRecordProcessor,
  SimpleLogRecordProcessor,
} from '@opentelemetry/sdk-logs'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions'
import { logs, SeverityNumber } from '@opentelemetry/api-logs'

const resource = resourceFromAttributes({
  [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'kaylas-garden',
})

const logExporter = new OTLPLogExporter()

const sdk = new NodeSDK({
  resource,
  traceExporter: new OTLPTraceExporter(),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter(),
    exportIntervalMillis: 5000,
  }),
  // Use SimpleLogRecordProcessor for immediate export
  logRecordProcessors: [new SimpleLogRecordProcessor(logExporter)],
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
  ],
})

sdk.start()

// Bridge console.log/warn/error to OTel structured logs
const otelLogger = logs.getLogger('console')

const originalLog = console.log
const originalWarn = console.warn
const originalError = console.error

console.log = (...args: unknown[]) => {
  otelLogger.emit({
    severityNumber: SeverityNumber.INFO,
    severityText: 'INFO',
    body: args.map(String).join(' '),
  })
  originalLog.apply(console, args)
}

console.warn = (...args: unknown[]) => {
  otelLogger.emit({
    severityNumber: SeverityNumber.WARN,
    severityText: 'WARN',
    body: args.map(String).join(' '),
  })
  originalWarn.apply(console, args)
}

console.error = (...args: unknown[]) => {
  otelLogger.emit({
    severityNumber: SeverityNumber.ERROR,
    severityText: 'ERROR',
    body: args.map(String).join(' '),
  })
  originalError.apply(console, args)
}

process.on('SIGTERM', () => {
  sdk
    .shutdown()
    .catch((error) => originalError('Error shutting down OTel SDK', error))
    .finally(() => process.exit(0))
})
