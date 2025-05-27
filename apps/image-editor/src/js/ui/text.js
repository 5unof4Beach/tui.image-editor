import Range from '@/ui/tools/range';
import Colorpicker from '@/ui/tools/colorpicker';
import Submenu from '@/ui/submenuBase';
import templateHtml from '@/ui/template/submenu/text';
import { assignmentForDestroy } from '@/util';
import { defaultTextRangeValues, eventNames, selectorNames } from '@/consts';
import FontPicker from 'font-picker';
import { fabric } from 'fabric';

/**
 * Crop ui class
 * @class
 * @ignore
 */
class Text extends Submenu {
  constructor(subMenuElement, { locale, makeSvgIcon, menuBarPosition, usageStatistics }) {
    super(subMenuElement, {
      locale,
      name: 'text',
      makeSvgIcon,
      menuBarPosition,
      templateHtml,
      usageStatistics,
    });
    this.effect = {
      bold: false,
      italic: false,
      underline: false,
    };
    this.align = 'tie-text-align-left';
    this.fontFamily = '';
    this.aggregatedFontFamilies = {};
    this.currTextId = null;
    this._els = {
      textEffectButton: this.selector('.tie-text-effect-button'),
      textAlignButton: this.selector('.tie-text-align-button'),
      textColorpicker: new Colorpicker(this.selector('.tie-text-color'), {
        defaultColor: '#ffbb3b',
        toggleDirection: this.toggleDirection,
        usageStatistics: this.usageStatistics,
      }),
      textRange: new Range(
        {
          slider: this.selector('.tie-text-range'),
          input: this.selector('.tie-text-range-value'),
        },
        defaultTextRangeValues
      ),
    };

    this.colorPickerInputBox = this._els.textColorpicker.colorpickerElement.querySelector(
      selectorNames.COLOR_PICKER_INPUT_BOX
    );

    this.fontPicker = new FontPicker('AIzaSyA-idhbqeBji6y5lErh5Ff7Xjk99QRFrrs', 'Noto Sans', {
      limit: 100,
      variants: ['regular', 'italic', '700'],
    });

    this.fontPicker.setOnChange(async (font) => {
      async function isFontLoaded(fontFamily) {
        try {
          const loadPromises = [
            document.fonts.load(`16px ${fontFamily}`),
            font.files['700'] ? document.fonts.load(`bold 16px ${fontFamily}`) : Promise.resolve(),
            font.files.italic
              ? document.fonts.load(`italic 16px ${fontFamily}`)
              : Promise.resolve(),
          ];

          await Promise.all(loadPromises);

          return true;
        } catch (error) {
          return false;
        }
      }

      this.aggregatedFontFamilies[this.currTextId] = font;
      if (this.fontFamily === font.family) return;

      await isFontLoaded(font.family).then((loaded) => {
        if (loaded) {
          this.actions.changeTextStyle({
            fontFamily: font.family,
          });
        } else {
          console.log(`${font.family} is not loaded`);
        }
      });

      this._updateFabricExportSvgPrototype(this.aggregatedFontFamilies);
    });
  }

  /**
   * Destroys the instance.
   */
  destroy() {
    this._removeEvent();
    this._els.textColorpicker.destroy();
    this._els.textRange.destroy();

    assignmentForDestroy(this);
  }

  /**
   * Add event for text
   * @param {Object} actions - actions for text
   *   @param {Function} actions.changeTextStyle - change text style
   */
  addEvent(actions) {
    const setTextEffect = this._setTextEffectHandler.bind(this);
    const setTextAlign = this._setTextAlignHandler.bind(this);

    this.eventHandler = {
      setTextEffect,
      setTextAlign,
    };

    this.actions = actions;
    this._els.textEffectButton.addEventListener('click', setTextEffect);
    this._els.textAlignButton.addEventListener('click', setTextAlign);
    this._els.textRange.on('change', this._changeTextRnageHandler.bind(this));
    this._els.textColorpicker.on('change', this._changeColorHandler.bind(this));

    this.colorPickerInputBox.addEventListener(
      eventNames.FOCUS,
      this._onStartEditingInputBox.bind(this)
    );
    this.colorPickerInputBox.addEventListener(
      eventNames.BLUR,
      this._onStopEditingInputBox.bind(this)
    );
  }

  /**
   * Remove event
   * @private
   */
  _removeEvent() {
    const { setTextEffect, setTextAlign } = this.eventHandler;

    this._els.textEffectButton.removeEventListener('click', setTextEffect);
    this._els.textAlignButton.removeEventListener('click', setTextAlign);
    this._els.textRange.off();
    this._els.textColorpicker.off();

    this.colorPickerInputBox.removeEventListener(
      eventNames.FOCUS,
      this._onStartEditingInputBox.bind(this)
    );
    this.colorPickerInputBox.removeEventListener(
      eventNames.BLUR,
      this._onStopEditingInputBox.bind(this)
    );
  }

  /**
   * Returns the menu to its default state.
   */
  changeStandbyMode() {
    this.actions.stopDrawingMode();
    this.actions.enableAllSelectable();
  }

  /**
   * Executed when the menu starts.
   */
  changeStartMode() {
    this.actions.stopDrawingMode();
    this.actions.disableAllSelectable();

    this.actions.modeChange('text');
  }

  /**
   * Get text color
   * @returns {string} - text color
   */
  get textColor() {
    return this._els.textColorpicker.color;
  }

  set textColor(color) {
    this._els.textColorpicker.color = color;
  }

  /**
   * Get text size
   * @returns {string} - text size
   */
  get fontSize() {
    return this._els.textRange.value;
  }

  /**
   * Set text size
   * @param {Number} value - text size
   */
  set fontSize(value) {
    this._els.textRange.value = value;
  }

  /**
   * get font style
   * @returns {string} - font style
   */
  get fontStyle() {
    return this.effect.italic ? 'italic' : 'normal';
  }

  /**
   * get font weight
   * @returns {string} - font weight
   */
  get fontWeight() {
    return this.effect.bold ? 'bold' : 'normal';
  }

  /**
   * get text underline text underline
   * @returns {boolean} - true or false
   */
  get underline() {
    return this.effect.underline;
  }

  setTextStyleStateOnAction(textStyle = {}) {
    const { fill, fontSize, fontStyle, fontWeight, textDecoration, textAlign, fontFamily, id } =
      textStyle;

    this.textColor = fill;
    this.fontSize = fontSize;
    this.fontFamily = fontFamily;
    this.currTextId = id;
    this.setEffectState('italic', fontStyle);
    this.setEffectState('bold', fontWeight);
    this.setEffectState('underline', textDecoration);
    this.setAlignState(`tie-text-align-${textAlign}`);
    this.setFontFamilyState(fontFamily);
  }

  setFontFamilyState(fontFamily) {
    this.fontPicker.setActiveFont(fontFamily);
  }

  setEffectState(effectName, value) {
    const effectValue = value === 'italic' || value === 'bold' || value === 'underline';
    const button = this._els.textEffectButton.querySelector(
      `.tui-image-editor-button.${effectName}`
    );

    this.effect[effectName] = effectValue;

    button.classList[effectValue ? 'add' : 'remove']('active');
  }

  setAlignState(value) {
    const button = this._els.textAlignButton;
    button.classList.remove(this.align);
    button.classList.add(value);
    this.align = value;
  }

  /**
   * text effect set handler
   * @param {object} event - add button event object
   * @private
   */
  _setTextEffectHandler(event) {
    const button = event.target.closest('.tui-image-editor-button');
    if (button) {
      const [styleType] = button.className.match(/(bold|italic|underline)/);
      const styleObj = {
        bold: { fontWeight: 'bold' },
        italic: { fontStyle: 'italic' },
        underline: { textDecoration: 'underline' },
      }[styleType];

      this.effect[styleType] = !this.effect[styleType];
      button.classList.toggle('active');
      this.actions.changeTextStyle(styleObj);
    }
  }

  /**
   * text effect set handler
   * @param {object} event - add button event object
   * @private
   */
  _setTextAlignHandler(event) {
    const button = event.target.closest('.tui-image-editor-button');
    if (button) {
      const styleType = this.getButtonType(button, ['left', 'center', 'right']);
      const styleTypeAlias = `tie-text-align-${styleType}`;

      event.currentTarget.classList.remove(this.align);
      if (this.align !== styleTypeAlias) {
        event.currentTarget.classList.add(styleTypeAlias);
      }
      this.actions.changeTextStyle({ textAlign: styleType });

      this.align = styleTypeAlias;
    }
  }

  /**
   * text align set handler
   * @param {number} value - range value
   * @param {boolean} isLast - Is last change
   * @private
   */
  _changeTextRnageHandler(value, isLast) {
    this.actions.changeTextStyle(
      {
        fontSize: value,
      },
      !isLast
    );
  }

  /**
   * change color handler
   * @param {string} color - change color string
   * @private
   */
  _changeColorHandler(color) {
    color = color || 'transparent';
    this.actions.changeTextStyle({
      fill: color,
    });
  }

  _updateFabricExportSvgPrototype(fontData) {
    if (!fabric.Canvas.prototype._originalToSVG) {
      fabric.Canvas.prototype._originalToSVG = fabric.Canvas.prototype.toSVG;
    }

    fabric.Canvas.prototype.toSVG = fabric.Canvas.prototype._originalToSVG;
    fabric.Canvas.prototype.toSVG = (function (originalFn) {
      return function (...args) {
        const svg = originalFn.call(this, ...args);

        // Create font-face declarations
        const fontFaces = Object.keys(fontData).reduce((accumulator, textId) => {
          const font = fontData[textId];
          if (font) {
            accumulator += `
                      <style type="text/css">
                        @font-face {
                          font-family: '${font.family}';
                          src: url('${font.files.regular}') format('woff2');
                          font-weight: normal;
                          font-style: normal;
                        }
                        ${
                          font.files.italic
                            ? `
                        @font-face {
                          font-family: '${font.family}';
                          src: url('${font.files.italic}') format('woff2');
                          font-weight: normal;
                          font-style: italic;
                        }`
                            : ''
                        }
                        ${
                          font.files['700']
                            ? `
                        @font-face {
                          font-family: '${font.family}';
                          src: url('${font.files['700']}) format('woff2');
                          font-weight: bold;
                          font-style: normal;
                        }
                      </style>\n`
                            : ''
                        }`;
          }

          return accumulator;
        }, '');

        const cleanedSvg = svg.replace(/<style[^>]*>[\s\S]*?<\/style>/g, '');

        // Insert font-face declarations into SVG's style section
        const svgTagMatch = cleanedSvg.match(/<svg[^>]*>/);
        if (svgTagMatch) {
          const [svgTag] = svgTagMatch;
          const svgTagIndex = svg.indexOf(svgTag);
          const insertPosition = svgTagIndex + svgTag.length;

          // Insert style tag immediately after the SVG tag
          const res = `${svg.slice(0, insertPosition)}\n  ${fontFaces}${svg.slice(insertPosition)}`;

          return res;
        }

        return cleanedSvg;
      };
    })(fabric.Canvas.prototype.toSVG);
  }
}

export default Text;
