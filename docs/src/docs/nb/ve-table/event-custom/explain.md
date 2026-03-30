:::tip
1. Konfigurer egendefinerte hendelser med `eventCustomOption`<br>
2. Stotter egendefinerte hendelser for rader og celler i body, header og footer<br>
3. Folgende hendelser stottes:

-   click
-   dblclick
-   contextmen
-   mouseenter
-   mouseleave
-   mousemove
-   mouseover
-   mousedown
-   mouseup

:::

Hurtigoversikt over konfigurasjon

```
eventCustomOption: {
  // body rad-hendelser
  bodyRowEvents: ({ row, rowIndex }) => {
    return {
      click: (event) => {},
      dblclick: (event) => {},
      contextmenu: (event) => {},
      mouseenter: (event) => {},
      mouseleave: (event) => {},
      mousemove: (event) => {},
      mouseover: (event) => {},
      mousedown: (event) => {},
      mouseup: (event) => {},
    };
  },
  // body celle-hendelser
  bodyCellEvents: ({ row,column,rowIndx }) => {
    return {
      click: (event) => {},
      dblclick: (event) => {},
      contextmenu: (event) => {},
      mouseenter: (event) => {},
      mouseleave: (event) => {},
      mousemove: (event) => {},
      mouseover: (event) => {},
      mousedown: (event) => {},
      mouseup: (event) => {},
    };
  },
  // header rad-hendelser
  headerRowEvents: ({ rowIndx }) => {
    return {
      click: (event) => {},
      dblclick: (event) => {},
      contextmenu: (event) => {},
      mouseenter: (event) => {},
      mouseleave: (event) => {},
      mousemove: (event) => {},
      mouseover: (event) => {},
      mousedown: (event) => {},
      mouseup: (event) => {},
    };
  },
  // header celle-hendelser
  headerCellEvents: ({ column,rowIndx }) => {
    return {
      click: (event) => {},
      dblclick: (event) => {},
      contextmenu: (event) => {},
      mouseenter: (event) => {},
      mouseleave: (event) => {},
      mousemove: (event) => {},
      mouseover: (event) => {},
      mousedown: (event) => {},
      mouseup: (event) => {},
    };
  },
  // footer rad-hendelser
  footerRowEvents: ({ row, rowIndex }) => {
    return {
      click: (event) => {},
      dblclick: (event) => {},
      contextmenu: (event) => {},
      mouseenter: (event) => {},
      mouseleave: (event) => {},
      mousemove: (event) => {},
      mouseover: (event) => {},
      mousedown: (event) => {},
      mouseup: (event) => {},
    };
  },
  // footer celle-hendelser
  footerCellEvents: ({ row,column,rowIndx }) => {
    return {
      click: (event) => {},
      dblclick: (event) => {},
      contextmenu: (event) => {},
      mouseenter: (event) => {},
      mouseleave: (event) => {},
      mousemove: (event) => {},
      mouseover: (event) => {},
      mousedown: (event) => {},
      mouseup: (event) => {},
    };
  },
},
```
