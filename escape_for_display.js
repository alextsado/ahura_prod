/**
 * Escape a string for display in a template
 */

let reUnescapedHtml = /[&<>"'`]/g;

let htmlEscapes = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '`': '&#96;'
};

export function escape_for_display(content){
    return content.replace(reUnescapedHtml, chr => htmlEscapes[chr]);
}
