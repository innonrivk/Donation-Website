# Support Nested Formatting (Bold and Gradient)

This implementation plan addresses the request to allow `* **Together** *` to render as both bold and blue (gradient). Currently, the parsing logic prevents bold asterisks (`*`) from matching if there are any other asterisks inside them.

## Proposed Changes

---

### Utility Logic

#### [MODIFY] [formatContent.jsx](file:///c:/Users/Lenovo/OneDrive/Documents/Donation%20site/Donation-Site-Project/client/src/utils/formatContent.jsx)
- **`parseTextRecursive`**: 
  - Update the `boldRegex` variable.
  - **Current**: `const boldRegex = /\*([^*]+)\*/g;`
  - **New**: `const boldRegex = /(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g;`
  
  **Why?** 
  The old regex used `[^*]+` to strictly prevent matching inner asterisks, which stopped it from greedily matching `**`. However, this also completely broke intentional nesting like `* **Text** *`. 
  By replacing it with negative lookbehinds/lookaheads (`(?<!\*)` and `(?!\*)`), the parser accurately identifies single standalone asterisks for the boundary, while allowing the `.+?` inside to safely capture inner `**` tags. Because the parser is already recursive, capturing ` **Together** ` inside bold will automatically trigger the gradient parser on the inner text.

---

## Verification Plan

### Manual Verification
1. Open the application and navigate to the admin **Edit Content Page**.
2. In the Footer Settings (or any text block), input `* **Together** *, We create change.`
3. Save changes.
4. Navigate to the frontend page where that text renders.
5. Verify visually and through DOM inspection that "Together" is wrapped in BOTH a `<strong>` (bold) and `<span className="gradient-text">` (blue gradient).
