import React from 'react';

/**
 * Recursively parses formatting tokens in a text string and returns React elements.
 * Supports nesting (e.g. bold inside gradient) and degrades safely on unclosed markers.
 * 
 * Why recursive? Nested formatting styles (like gold text within a larger gradient headline)
 * require a tree-like parsing model. Linear split regexes would flatten the output and break
 * nested elements. A search-and-recurse pattern resolves the earliest valid enclosing pair first.
 * 
 * Why regex loops? Javascript lacks native match-earliest regex flags. Checking all formats 
 * sequentially and sorting by match index ensures the correct token order is preserved.
 *
 * @param {string} text - Input plain text segment.
 * @returns {React.ReactNode[]} Array of React elements and strings.
 */
function parseTextRecursive(text) {
  if (!text) return [];

  let earliestMatch = null;
  let earliestIndex = Infinity;
  let matchType = null; // 'gradient' | 'gold' | 'bold' | 'underline'

  // Match: **text** (Primary Gradient)
  const gradRegex = /\*\*(.*?)\*\*/g;
  let match;
  while ((match = gradRegex.exec(text)) !== null) {
    if (match.index < earliestIndex) {
      earliestIndex = match.index;
      earliestMatch = match;
      matchType = 'gradient';
    }
  }

  // Match: $$text$$ (Gold Gradient)
  const goldRegex = /\$\$(.*?)\$\$/g;
  while ((match = goldRegex.exec(text)) !== null) {
    if (match.index < earliestIndex) {
      earliestIndex = match.index;
      earliestMatch = match;
      matchType = 'gold';
    }
  }

  // Match: __text__ (Underline)
  const underlineRegex = /__(.*?)__/g;
  while ((match = underlineRegex.exec(text)) !== null) {
    if (match.index < earliestIndex) {
      earliestIndex = match.index;
      earliestMatch = match;
      matchType = 'underline';
    }
  }

  // Match: *text* (Bold)
  // Why match non-asterisks? Avoids greedily matching parts of double asterisks (**).
  const boldRegex = /\*([^*]+)\*/g;
  while ((match = boldRegex.exec(text)) !== null) {
    if (match.index < earliestIndex) {
      earliestIndex = match.index;
      earliestMatch = match;
      matchType = 'bold';
    }
  }

  // Base Case: If no tokens match, return string segment directly
  if (!earliestMatch) {
    return [text];
  }

  const prefix = text.slice(0, earliestIndex);
  const innerText = earliestMatch[1];
  const suffix = text.slice(earliestIndex + earliestMatch[0].length);

  const parsedInner = parseTextRecursive(innerText);

  let wrappedElement;
  const key = `fmt-${earliestIndex}-${matchType}`;

  if (matchType === 'gradient') {
    wrappedElement = <span key={key} className="gradient-text">{parsedInner}</span>;
  } else if (matchType === 'gold') {
    wrappedElement = <span key={key} className="gradient-gold">{parsedInner}</span>;
  } else if (matchType === 'underline') {
    wrappedElement = <span key={key} className="underline-text">{parsedInner}</span>;
  } else if (matchType === 'bold') {
    wrappedElement = <strong key={key} className="bold-text">{parsedInner}</strong>;
  }

  return [
    ...parseTextRecursive(prefix),
    wrappedElement,
    ...parseTextRecursive(suffix)
  ];
}

/**
 * Main parser utility to convert raw text with layout styles and line breaks into React nodes.
 * 
 * Why split by paragraphs/lines first? Pre-splitting layout text elements by paragraphs (\n\n)
 * and line breaks (\n) ensures that structural block styles (like <p> and <br /> tags) are
 * generated cleanly, avoiding the need for a full, heavy markdown library like react-markdown.
 *
 * @param {string} text - The raw string database copy.
 * @returns {React.ReactNode} React element tree.
 */
export function formatContent(text) {
  if (!text) return '';

  const paragraphs = text.split('\n\n');

  return paragraphs.map((para, paraIdx) => {
    const lines = para.split('\n');
    const renderedLine = lines.map((line, lineIdx) => {
      const parsedElements = parseTextRecursive(line);
      return (
        <React.Fragment key={`line-${lineIdx}`}>
          {lineIdx > 0 && <br />}
          {parsedElements}
        </React.Fragment>
      );
    });

    return (
      <p key={`p-${paraIdx}`} className="layout-paragraph">
        {renderedLine}
      </p>
    );
  });
}

/**
 * Parses formatting tokens and returns inline React elements without paragraph wrapping.
 *
 * Why inline? Heading tags (<h1>, <h2>) must not contain nested block-level <p> tags,
 * which would violate semantic HTML specifications and cause markup hydration warnings.
 *
 * @param {string} text - Raw content block.
 * @returns {React.ReactNode} Inline react node tree.
 */
export function formatContentInline(text) {
  if (!text) return '';
  return parseTextRecursive(text);
}
