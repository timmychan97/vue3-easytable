## Theme Customization

:::anchor Built-in Themes
Two themes are provided by default: a blue theme and a dark theme.

#### Using the Blue Theme

Import the blue theme styles:

```
import "@vue3-easytable/vue/libs/theme-default/index.css";
```

#### Using the Dark Theme

```
import "@vue3-easytable/vue/libs/theme-dark/index.css";
```

:::anchor Theme Customization

The styles of @vue3-easytable/vue are written in Less, with a set of global/component style variables defined. You can adjust them according to your needs.

#### Customizing Based on the Blue Theme

If the theme you need is close to the blue theme, you can customize based on it. All blue theme style variables can be found **[here](https://github.com/huangshuwei/vue-easytable/blob/master/packages/theme-default/var.less)**.

Create a separate Less variable file, e.g. vue-easytable-variables.less, and import it to override the variables in var.less.

```
@import '~@vue3-easytable/vue/packages/theme-default/index.less'; // Import the official Less style entry file
@import 'your-theme-file.less'; // Used to override the variables defined above
```

Then, in your project's entry file, import the above style file directly (no need to import the compiled CSS file from @vue3-easytable/vue):

```
import { createApp } from 'vue'
import { useVeTable } from '@vue3-easytable/vue'
import './vue-easytable-variables.less'

createApp(App).use(useVeTable())
```

#### Customizing Based on the Dark Theme

If the theme you need is close to the dark theme, you can customize based on it. All dark theme style variables can be found **[here](https://github.com/huangshuwei/vue-easytable/blob/master/packages/theme-dark/var.less)**.

Create a separate Less variable file, e.g. vue-easytable-variables.less, and import it to override the variables in var.less.

```
@import '~@vue3-easytable/vue/packages/theme-dark/index.less'; // Import the official Less style entry file
@import 'your-theme-file.less'; // Used to override the variables defined above
```

Then, in your project's entry file, import the above style file directly (no need to import the compiled CSS file from @vue3-easytable/vue):

```
import { createApp } from 'vue'
import { useVeTable } from '@vue3-easytable/vue'
import './vue-easytable-variables.less'

createApp(App).use(useVeTable())
```
