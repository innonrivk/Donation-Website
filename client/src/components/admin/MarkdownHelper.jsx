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
      <p className="helper-desc">Custom styles supported on our public layout components:</p>
      <ul className="helper-list">
        <li>
          <code>**Text**</code>
          <span>Blue/Teal Gradient highlight.</span>
        </li>
        <li>
          <code>$$Text$$</code>
          <span>Gold Gradient highlight.</span>
        </li>
        <li>
          <code>*Text*</code>
          <span>Renders standard <strong>bold</strong> text.</span>
        </li>
        <li>
          <code>***Text***</code>
          <span>Combined <strong>bold and gradient</strong> highlight.</span>
        </li>
        <li>
          <code>__Text__</code>
          <span>Renders <span style={{ textDecoration: 'underline' }}>underlined</span> text.</span>
        </li>
        <li>
          <code>\n\n</code>
          <span>Forces a paragraph break.</span>
        </li>
      </ul>
    </div>
  );
}
