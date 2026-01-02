import ThemeSwitcherTool from 'theme-switcher-tool'

const styleLinkId = 'theme_creator_cli_style_id'

// In development, themes are loaded locally via main.ts imports
// Theme switching is disabled in development since we use local Less files
const isDev = import.meta.env.DEV

const themeSwitcherTool = isDev
  ? null
  : ThemeSwitcherTool({
    // Your theme list - only used in production builds
      themeList: [
        {
          themeName: 'dark',
          themePath: 'https://unpkg.com/@easytable/vue/libs/theme-dark/index.css',
        },
        {
          themeName: 'default',
          themePath: 'https://unpkg.com/@easytable/vue/libs/theme-default/index.css',
        },
      ],
      // Your actual style id
      styleLinkId,
      useStorage: false,
      storageKey: 'theme_switcher_tool_theme',
    })

export default function useThemeSwitch() {
  return {
    // switch theme mix
    switchThemeMix(themeName: string) {
      // In development, theme switching is not supported
      // since themes are bundled from local Less files
      if (isDev) {
        console.log('[Dev] Theme switching disabled - using local Less files. Theme requested:', themeName)
        return Promise.resolve()
      }

      console.log('themeName', themeName)

      return new Promise((resolve, reject) => {
        themeSwitcherTool!
          .switcher({
            themeName,
          })
          .then(() => {
            resolve(void 0)
          })
          .catch(reject)
      })
    },
  }
}
