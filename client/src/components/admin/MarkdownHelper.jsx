import React from 'react';

/**
 * MarkdownHelper component displays inline formatting guide tips.
 *
 * Why is this a shared component? Placing the guide helper in a reusable component
 * allows multiple CMS configuration views (content, tiers, milestones, donation boxes)
 * to consistently show the exact same syntax options to administrators.
 *
 * @returns {JSX.Element} The rendered guide card.
 */
export default function MarkdownHelper() {
  return (
    <div className="markdown-helper-card">
      <h3 className="helper-title">💡 Formatting Guide</h3>
      <p className="helper-desc">Custom markup supported across all headline, subheadline, and label fields:</p>
      
      <div className="helper-section">
        <h4 className="helper-section-title">Core Formatting</h4>
        <div className="helper-grid">
          <div className="helper-row">
            <code>*text*</code>
            <span>Renders standard <strong>bold</strong> text.</span>
          </div>
          <div className="helper-row">
            <code>__text__</code>
            <span>Renders <span style={{ textDecoration: 'underline' }}>underlined</span> text.</span>
          </div>
          <div className="helper-row">
            <code>\n\n</code>
            <span>Forces a paragraph break.</span>
          </div>
        </div>
      </div>

      <div className="helper-section">
        <h4 className="helper-section-title">Color Gradients</h4>
        <div className="helper-grid">
          <div className="helper-row">
            <code>**text**</code>
            <span className="preview-gradient">Blue/Teal Gradient.</span>
          </div>
          <div className="helper-row">
            <code>$$text$$</code>
            <span className="preview-gold">Gold Gradient.</span>
          </div>
        </div>
      </div>

      <div className="helper-section">
        <h4 className="helper-section-title">Special Modifiers</h4>
        <div className="helper-grid">
          <div className="helper-row">
            <code>!!text!!</code>
            <span>
              <strong>Styling Separator (Wall).</strong> Separates the underline settings from the text settings. When placed next to the text, it forces default color & unbolds (overriding parent colors and font weights back to standard text).
            </span>
          </div>
        </div>
      </div>

      <div className="helper-section helper-section--advanced">
        <h4 className="helper-section-title">Useful Formulas (Nesting)</h4>
        <div className="helper-formulas">
          <div className="formula-item">
            <div className="formula-code"><code>*$$__!!text!!__$$*</code></div>
            <div className="formula-desc">Gold underline under standard-color, unbolded text (colored underline only).</div>
          </div>
          <div className="formula-item">
            <div className="formula-code"><code>**__!!text!!__**</code></div>
            <div className="formula-desc">Blue underline under standard-color, unbolded text (colored underline only).</div>
          </div>
          <div className="formula-item">
            <div className="formula-code"><code>*__text__*</code></div>
            <div className="formula-desc">Bold text with a thick bold underline.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
