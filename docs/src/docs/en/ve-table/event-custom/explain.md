:::tip
1. Configure custom events with `eventCustomOption`<br>
2. Supports custom events for body, header, and footer rows and cells<br>
3. The following events are supported:

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

Quick configuration overview

```
eventCustomOption: {
  // body row custom events
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
  // body cell custom events
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
  // header row custom events
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
  // header cell custom events
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
  // footer row custom events
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
  // footer cell custom events
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
