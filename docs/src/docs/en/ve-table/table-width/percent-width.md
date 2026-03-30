:::anchor Dynamic Table Width (Percentage)

:::demo 1. style="width:80%" 2. Drag the handle to resize

```html
<template>
    <div>
        <div style="position:relative;display:flex;align-items:stretch;min-height:100px">
            <div :style="{ width: containerWidth + 'px', minWidth: '200px', flexShrink: 0, overflow: 'hidden' }">
                <ve-table style="width:100%" :columns="columns" :table-data="tableData" />
            </div>
            <div
                :style="{
                    width: '10px',
                    cursor: 'col-resize',
                    background: dragging ? '#6366f1' : '#cbd5e1',
                    borderRadius: '5px',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: dragging ? 'none' : 'background 0.15s',
                    userSelect: 'none',
                    margin: '0 2px'
                }"
                @mousedown="onDragStart"
                @mouseenter="onHandleEnter"
                @mouseleave="onHandleLeave"
            >
                <span style="color:#fff;font-size:14px;user-select:none;pointer-events:none">||</span>
            </div>
            <div style="flex:1;min-width:20px"></div>
        </div>
        <div style="margin-top:8px;font-size:13px;color:#64748b">
            Width: <strong>{{ containerWidth }}px</strong>
        </div>
    </div>
</template>

<script>
    export default {
        data() {
            return {
                containerWidth: 600,
                dragging: false,
                columns: [
                    { field: "name", key: "a", title: "Name", width: 100 },
                    { field: "date", key: "b", title: "Tel", width: 200 },
                    { field: "hobby", key: "c", title: "Hobby", width: 300 },
                    { field: "address", key: "d", title: "Address", width: 300 },
                ],
                tableData: [
                    {
                        name: "John",
                        date: "1900-05-20",
                        hobby: "coding and coding repeat",
                        address: "No.1 Century Avenue, Shanghai",
                    },
                    {
                        name: "Dickerson",
                        date: "1910-06-20",
                        hobby: "coding and coding repeat",
                        address: "No.1 Century Avenue, Beijing",
                    },
                    {
                        name: "Larsen",
                        date: "2000-07-20",
                        hobby: "coding and coding repeat",
                        address: "No.1 Century Avenue, Chongqing",
                    },
                    {
                        name: "Geneva",
                        date: "2010-08-20",
                        hobby: "coding and coding repeat",
                        address: "No.1 Century Avenue, Xiamen",
                    },
                    {
                        name: "Jami",
                        date: "2020-09-20",
                        hobby: "coding and coding repeat",
                        address: "No.1 Century Avenue, Shenzhen",
                    },
                ],
            };
        },
        methods: {
            onHandleEnter(e) {
                if (!this.dragging) e.target.style.background = '#6366f1';
            },
            onHandleLeave(e) {
                if (!this.dragging) e.target.style.background = '#cbd5e1';
            },
            onDragStart(e) {
                e.preventDefault();
                this.dragging = true;
                const startX = e.clientX;
                const startWidth = this.containerWidth;
                const onMove = (ev) => {
                    this.containerWidth = Math.max(200, startWidth + ev.clientX - startX);
                };
                const onUp = () => {
                    this.dragging = false;
                    document.removeEventListener('mousemove', onMove);
                    document.removeEventListener('mouseup', onUp);
                };
                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp);
            },
        },
    };
</script>
```

:::