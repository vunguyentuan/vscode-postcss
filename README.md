![Banner](https://github.com/vunguyentuan/vscode-postcss/raw/master/banner.jpg)

> This extension is a mixed of two famous extensions [postcss-language](https://github.com/csstools/postcss-language.git) and [vscode-postcss-language](https://github.com/MhMadHamster/vscode-postcss-language).

<p align="center">
<a href="https://marketplace.visualstudio.com/items?itemName=vunguyentuan.vscode-postcss"><img src="https://vsmarketplacebadge.apphb.com/installs-short/vunguyentuan.vscode-postcss.svg" alt="Installs"/></a>
<a href="https://marketplace.visualstudio.com/items?itemName=vunguyentuan.vscode-postcss"><img src="https://vsmarketplacebadge.apphb.com/version/vunguyentuan.vscode-postcss.svg" alt=""/></a>
<a href="https://marketplace.visualstudio.com/items?itemName=vunguyentuan.vscode-postcss"><img src="https://vsmarketplacebadge.apphb.com/rating-star/vunguyentuan.vscode-postcss.svg" alt=""/></a>
</p>

## Installation

**[Install via the Visual Studio Code Marketplace →](https://marketplace.visualstudio.com/items?itemName=vunguyentuan.vscode-postcss)**



## Features
- Basic autocomplete
- Syntax highlighting
- Support color preview
- Play nicely with [CSS Variable Autocomplete](https://marketplace.visualstudio.com/items?itemName=vunguyentuan.vscode-css-variables) extension.

## Support for Emmet

1. Open the command palette and select **Preferences: Open Settings (JSON)**
2. Add the following configuration:

```json
{
  "emmet.includeLanguages": {
    "postcss": "css"
  }
}
```
## Future development
- Add real postcss language service server (currently using SASS language service with some tweaks)