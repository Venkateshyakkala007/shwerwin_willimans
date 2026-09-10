export type ConnectorName = 'entra' | 'hr' | 'learning' | 'databricks';

export interface ConnectorRuntimeConfig {
  name: ConnectorName;
  enabled: boolean;
  endpoint?: string;
}

export function assertProductionConnectorConfig(
  configs: ConnectorRuntimeConfig[],
) {
  if (process.env.NODE_ENV !== 'production') return;
  const enabledWithoutEndpoint = configs.find(
    (config) => config.enabled && !config.endpoint,
  );
  if (enabledWithoutEndpoint) {
    throw new Error(
      `${enabledWithoutEndpoint.name} is enabled without a production endpoint`,
    );
  }
}
