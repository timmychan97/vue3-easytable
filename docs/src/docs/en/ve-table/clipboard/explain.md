:::tip
1. You can select cells and perform batch copy, paste, cut, and delete operations just like in Excel<br>
2. The context menu **Copy** and **Cut** write with the Clipboard API (`navigator.clipboard`) and fall back to `document.execCommand("copy")` when it is unavailable (for example outside a secure context). If both fail, `clipboardOption.writeError({ type, error, text, data, selectionRangeIndexes, selectionRangeKeys })` is called (without it a warning is logged), and a failed cut leaves the cells unchanged<br>
3. Paste, cut and delete skip operation columns and columns without `field`, and the other columns keep their positions

:::
