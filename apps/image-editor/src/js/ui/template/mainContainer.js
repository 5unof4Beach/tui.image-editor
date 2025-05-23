export default ({
  locale,
  commonStyle,
  headerStyle,
  loadButtonStyle,
  downloadButtonStyle,
  submenuStyle,
}) => `
    <div class="tui-image-editor-main-container" style="${commonStyle}">
        <div class="tui-image-editor-header" style="${headerStyle}">
            <div class="tui-image-editor-header-buttons">
                <div style="${loadButtonStyle}">
                    ${locale.localize('Load')}
                    <input type="file" class="tui-image-editor-load-btn" />
                </div>
                <div style="${loadButtonStyle}">
                    ${locale.localize('Import SVG')}
                    <input type="file" class="tui-image-editor-import-btn" accept=".svg" />
                </div>
                <button class="tui-image-editor-download-btn" style="${downloadButtonStyle}">
                    ${locale.localize('Download')}
                </button>
                <button class="tui-image-editor-svg-download-btn" style="${downloadButtonStyle}">
                    ${locale.localize('Download SVG')}
                </button>
            </div>
        </div>
        <div class="tui-image-editor-main">
            <div class="tui-image-editor-submenu">
                <div class="tui-image-editor-submenu-style" style="${submenuStyle}"></div>
            </div>
            <div class="tui-image-editor-wrap">
                <div class="tui-image-editor-size-wrap">
                    <div class="tui-image-editor-align-wrap">
                        <div class="tui-image-editor"></div>
                    </div>
                </div>
            </div>
        </div>
    </div>
`;
