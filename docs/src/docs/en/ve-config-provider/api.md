:::anchor API

### props

| Parameter | Description | Type | Options | Default |
| --------- | ----------- | ---- | ------- | ------- |
| locale | Language for the components inside the provider. It is merged on top of the outer language (the nearest outer `VeConfigProvider`, or the global language), so it can contain only the keys to change. The keys are listed on the [Internationalization](./locale) page. Deprecated English keys are still accepted and log a deprecation warning once per key. | `Object` | - | - |

### slots

| Name | Description |
| ---- | ----------- |
| default | The components that use this language |
