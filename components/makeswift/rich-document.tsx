"use client";

import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { runtime } from "@/lib/makeswift/runtime";
import { Style, RichText, Select, TextArea, Group } from "@makeswift/runtime/controls";

type Width = "narrow" | "normal" | "wide" | "full";
type Editor = "makeswift";

interface RichDocumentProps {
  className?: string;
  content?: ReactNode;
  width?: Width;
  editor?: Editor;
  markdown?: {
    source?: string;
    // Select controls return their value as a string ("true"/"false").
    readOnly?: string;
  };
}

// Comfortable reading measures, like a document page.
const MAX_WIDTH: Record<Width, number | undefined> = {
  narrow: 640,
  normal: 760,
  wide: 960,
  full: undefined,
};

function RichDocument({
  className,
  content,
  width = "normal",
  editor = "makeswift",
  markdown,
}: RichDocumentProps) {
  return (
    <section className={className ?? ""}>
      <style>{DOC_CSS}</style>
      <div className="rtdoc" style={{ maxWidth: MAX_WIDTH[width], margin: "0 auto" }}>
        {content}
      </div>
    </section>
  );
}

// Document typography scoped to `.rtdoc`. The RichText editor emits semantic
// elements (h1–h6, p, ul/ol, blockquote, a, etc.); inline formatting the admin
// applies (bold, color, alignment, font) comes through as inline styles and
// composes on top of these base rules. All colors reuse the site's tokens.
const DOC_CSS = `
.rtdoc { color: var(--ink); font-family: var(--font-display); font-size: 16px; line-height: 1.7; padding: 8px 0; }
.rtdoc > :first-child { margin-top: 0; }
.rtdoc > :last-child { margin-bottom: 0; }

.rtdoc h1 { font-size: 36px; font-weight: 700; letter-spacing: -.025em; line-height: 1.1; margin: 1.4em 0 .5em; text-wrap: pretty; }
.rtdoc h2 { font-size: 28px; font-weight: 700; letter-spacing: -.02em; line-height: 1.15; margin: 1.3em 0 .45em; text-wrap: pretty; }
.rtdoc h3 { font-size: 22px; font-weight: 600; letter-spacing: -.015em; line-height: 1.2; margin: 1.2em 0 .4em; }
.rtdoc h4 { font-size: 18px; font-weight: 600; line-height: 1.3; margin: 1.1em 0 .35em; }
.rtdoc h5 { font-size: 15px; font-weight: 600; line-height: 1.3; margin: 1em 0 .3em; }
.rtdoc h6 {
  font-size: 12px; font-weight: 600; line-height: 1.3; margin: 1em 0 .3em;
  text-transform: uppercase; letter-spacing: .08em; color: var(--muted);
  font-family: var(--font-mono);
}

.rtdoc p { margin: 0 0 1em; }
.rtdoc a { color: var(--ink); text-decoration: underline; text-underline-offset: 2px; text-decoration-color: var(--line-2); transition: text-decoration-color .12s; }
.rtdoc a:hover { text-decoration-color: var(--ink); }

.rtdoc ul, .rtdoc ol { margin: 0 0 1em; padding-left: 1.4em; }
.rtdoc ul { list-style: disc; }
.rtdoc ol { list-style: decimal; }
.rtdoc li { margin: 0 0 .35em; padding-left: .25em; }
.rtdoc li::marker { color: var(--muted); }
.rtdoc ul ul, .rtdoc ol ol, .rtdoc ul ol, .rtdoc ol ul { margin: .35em 0 .35em; }

.rtdoc blockquote {
  margin: 1.2em 0; padding: 4px 0 4px 20px; border-left: 3px solid var(--line-2);
  color: var(--ink-2); font-style: italic;
}

.rtdoc strong, .rtdoc b { font-weight: 700; }
.rtdoc em, .rtdoc i { font-style: italic; }
.rtdoc u { text-decoration: underline; }
.rtdoc s, .rtdoc del { text-decoration: line-through; }

.rtdoc code {
  font-family: var(--font-mono); font-size: .88em;
  background: var(--bg-alt); border: 1px solid var(--line); border-radius: 4px;
  padding: 1px 5px;
}
.rtdoc pre {
  font-family: var(--font-mono); font-size: 13px; line-height: 1.5;
  background: var(--surface-2); border: 1px solid var(--line); border-radius: var(--radius-card);
  padding: 16px; overflow: auto; margin: 0 0 1em;
}
.rtdoc pre code { background: none; border: none; padding: 0; }

.rtdoc hr { border: 0; border-top: 1px solid var(--line); margin: 2em 0; }

.rtdoc img { max-width: 100%; height: auto; border-radius: var(--radius-card); }

@media (max-width: 767px) {
  .rtdoc { font-size: 15px; }
  .rtdoc h1 { font-size: 28px; }
  .rtdoc h2 { font-size: 23px; }
  .rtdoc h3 { font-size: 19px; }
}
`;

runtime.registerComponent(RichDocument, {
  type: "acme-rich-document",
  label: "Content / Document (Rich Text)",
  props: {
    className: Style(),
    width: Select({
      label: "Content width",
      options: [
        { value: "narrow", label: "Narrow (640px)" },
        { value: "normal", label: "Normal (760px)" },
        { value: "wide", label: "Wide (960px)" },
        { value: "full", label: "Full width" },
      ],
      defaultValue: "normal",
    }),
    // Block mode = full multi-paragraph WYSIWYG editing on the canvas:
    // headings, lists, blockquote, links, alignment, font/color, plus all the
    // standard keyboard shortcuts (⌘B / ⌘I / ⌘U, ⌘K for links, markdown-style
    // "# " → heading, "- " → bullet, "> " → quote, etc.).
    //
    // This is the RECOMMENDED editor for this component: it is Makeswift's own
    // control, so authoring happens truly inline on the builder canvas.
    content: RichText({ mode: RichText.Mode.Block }),

    // ---- Editor selector --------------------------------------------------
    // Lets a merchandiser swap the built-in Makeswift RichText for the
    // Syncfusion markdown editor. Defaults to Makeswift.
    editor: Select({
      label: "Editor",
      options: [
        { value: "makeswift", label: "Makeswift Rich Text (inline, recommended)" },
      ],
      defaultValue: "makeswift",
    }),

    // ---- Syncfusion markdown editor --------------------------------------
    // HONEST CAVEAT ABOUT THE MAKESWIFT EDITING MODEL:
    // The Syncfusion RTE is a self-contained, browser-only React widget with its
    // own toolbar and contentEditable surface. Makeswift renders registered
    // components inside a builder-controlled iframe where Makeswift owns the
    // editing/selection model — only Makeswift's OWN controls (RichText,
    // TextInput, TextArea, …) write content back to the page. A third-party
    // editor's toolbar/typing therefore CANNOT be the inline authoring surface
    // inside the builder canvas, and any edits typed into it on the live page
    // are NOT persisted back to Makeswift.
    //
    // So the realistic, working pattern is this: the markdown SOURCE is authored
    // via the Makeswift `TextArea` control below (in the properties panel, which
    // IS part of Makeswift's editing model), and the Syncfusion editor renders /
    // previews that markdown — fully interactive on the published page, and
    // visible (with a trial banner unless licensed) inside the builder canvas.
    markdown: Group({
      label: "Markdown (Syncfusion)",
      preferredLayout: Group.Layout.Popover,
      props: {
        source: TextArea({
          label: "Markdown source",
          defaultValue: "# Heading\n\nWrite **markdown** here.",
        }),
        readOnly: Select({
          label: "Live editing on page",
          options: [
            { value: "false", label: "Editable (show toolbar)" },
            { value: "true", label: "Read-only" },
          ],
          defaultValue: "false",
        }),
      },
    }),
  },
});
