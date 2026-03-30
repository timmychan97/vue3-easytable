:::anchor API

### props

| Parameter              | Description                                                          | Type      | Options                    | Default                    |
| ---------------------- | -------------------------------------------------------------------- | --------- | -------------------------- | -------------------------- |
| name                   | Loading effect type name                                             | `String`  | See "Loading Collection" examples | "plane"             |
| target                 | DOM element or a string selector accessible via `document.querySelector` | `Object   \| String`              | -                          | -   |
| fullscreen             | Whether to display in fullscreen                                     | `Boolean` | -                          | false                      |
| tip                    | Loading text                                                         | `String`  | -                          | -                          |
| color                  | Loading icon color                                                   | `String`  | -                          | "#1890ff"                  |
| overlayBackgroundColor | Overlay background color                                             | `String`  | -                          | "rgba(255, 255, 255, 0.5)" |
| height                 | Loading icon height                                                  | `String   \| Number`              | -                          | 40  |
| width                  | Loading icon width                                                   | `String   \| Number`              | -                          | 40  |

### methods

| Method Name | Description                                              | Parameters |
| ----------- | -------------------------------------------------------- | ---------- |
| show        | Show the Loading effect                                  | -          |
| close       | Close the Loading effect                                 | -          |
| destroy     | By default, closing does not destroy it; call this method to manually destroy the Loading instance | - |
