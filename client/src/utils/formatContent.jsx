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
  let matchType = null; // 'bold-gradient' | 'gradient' | 'gold' | 'underline' | 'bold'

  // Match: ***text*** (Bold Gradient)
  // Why check triple asterisks first? To ensure that the combined bold and gradient formatting
  // takes priority and does not get partially matched by double or single asterisk rules.
  const tripleRegex = /\*\*\*(.*?)\*\*\*/g;
  let match;
  while ((match = tripleRegex.exec(text)) !== null) {
    if (match.index < earliestIndex) {
      earliestIndex = match.index;
      earliestMatch = match;
      matchType = 'bold-gradient';
    }
  }

  // Match: **text** (Primary Gradient)
  const gradRegex = /\*\*(.*?)\*\*/g;
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
  // Why use this boundary regex instead of lookbehinds? Safari versions below 16.4 do not support 
  // negative lookbehinds (?<!...) and will throw a fatal SyntaxError. Using a captured boundary 
  // group allows us to safely ensure we only match outer standalone asterisks in a fully cross-browser manner.
  const boldRegex = /(^|[^*])\*([^*].*?[^*]|[^*])\*(?=[^*]|$)/g;
  while ((match = boldRegex.exec(text)) !== null) {
    const actualIndex = match.index + match[1].length;
    if (actualIndex < earliestIndex) {
      earliestIndex = actualIndex;
      earliestMatch = match;
      matchType = 'bold';
    }
  }

  // Base Case: If no tokens match, return string segment directly
  if (!earliestMatch) {
    return [text];
  }

  // Why calculate prefix/suffix with dynamic length? Since the bold regex captures the preceding 
  // boundary character in match[1], the actual text we replace has a offset start and shorter length.
  const prefix = text.slice(0, earliestIndex);
  let innerText;
  let matchLength;
  if (matchType === 'bold') {
    innerText = earliestMatch[2];
    matchLength = earliestMatch[0].length - earliestMatch[1].length;
  } else {
    innerText = earliestMatch[1];
    matchLength = earliestMatch[0].length;
  }
  const suffix = text.slice(earliestIndex + matchLength);

  const parsedInner = parseTextRecursive(innerText);

  let wrappedElement;
  const key = `fmt-${earliestIndex}-${matchType}`;

  // Why nested wrappers for bold-gradient? Wrapping a span with gradient-text inside a strong element
  // with bold-text ensures both font-weight and gradient background clipping apply cleanly together.
  if (matchType === 'bold-gradient') {
    wrappedElement = (
      <strong key={key} className="bold-text">
        <span className="gradient-text">{parsedInner}</span>
      </strong>
    );
  } else if (matchType === 'gradient') {
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
