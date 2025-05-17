import React, { useState, useRef, useEffect } from "react";
import { Editor, EditorState, ContentState, Modifier } from "draft-js";
import ReactMarkdown from "react-markdown";
import hljs from "highlight.js";
import "highlight.js/styles/atom-one-dark.css";
import "draft-js/dist/Draft.css";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// Polyfill for global to fix "global is not defined" error
if (typeof global === "undefined") {
  window.global = window.globalThis;
}

// Polyfill for setImmediate to fix "setImmediate is not a function" error
if (typeof setImmediate === "undefined") {
  console.log("Applying setImmediate polyfill");
  window.setImmediate = function (callback, ...args) {
    const timeoutId = setTimeout(() => {
      console.log("setImmediate polyfill executed");
      callback(...args);
    }, 0);
    return timeoutId;
  };
  window.clearImmediate = function (id) {
    console.log("clearImmediate polyfill executed");
    return clearTimeout(id);
  };
}

const MAX_STORAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const STORAGE_KEY = "markdown_documents_v1";
const MAX_DOCS = 10;

const ICONS = {
  open: (
    <svg
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M12 4v16m8-8H4" />
    </svg>
  ),
  h3: (
    <svg
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <text x="3" y="17" fontSize="16" fontWeight="bold">
        H3
      </text>
    </svg>
  ),
  h2: (
    <svg
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <text x="3" y="17" fontSize="16" fontWeight="bold">
        H2
      </text>
    </svg>
  ),
  bold: (
    <svg
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <text x="5" y="17" fontSize="16" fontWeight="bold">
        B
      </text>
    </svg>
  ),
  italic: (
    <svg
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <text x="7" y="17" fontSize="16" fontStyle="italic">
        I
      </text>
    </svg>
  ),
  ol: (
    <svg
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <text x="3" y="17" fontSize="16">
        1.
      </text>
    </svg>
  ),
  ul: (
    <svg
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <circle cx="8" cy="12" r="2" />
      <circle cx="8" cy="18" r="2" />
      <circle cx="8" cy="6" r="2" />
    </svg>
  ),
  download: (
    <svg
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M12 4v12m0 0l-4-4m4 4l4-4" />
      <rect x="4" y="18" width="16" height="2" rx="1" />
    </svg>
  ),
  undo: (
    <svg
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M9 14l-4-4 4-4" />
      <path d="M5 10h11a4 4 0 1 1 0 8h-1" />
    </svg>
  ),
  redo: (
    <svg
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M15 10l4 4-4 4" />
      <path d="M19 14H8a4 4 0 1 1 0-8h1" />
    </svg>
  ),
  clear: (
    <svg
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <rect x="5" y="5" width="14" height="14" rx="2" />
      <path d="M9 9l6 6m0-6l-6 6" />
    </svg>
  ),
  sync: (
    <svg
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M4 4v5h.582M20 20v-5h-.581" />
      <path d="M5.418 9A7.963 7.963 0 0 1 12 4c2.042 0 3.899.767 5.318 2.029M18.582 15A7.963 7.963 0 0 1 12 20a7.963 7.963 0 0 1-5.318-2.029" />
    </svg>
  ),
  help: (
    <svg
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 1 1 5.82 1c0 2-3 3-3 3" />
      <circle cx="12" cy="17" r="1" />
    </svg>
  ),
  pdf: (
    <svg
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M7 7h10v10H7z" />
      <text x="8" y="16" fontSize="8" fontWeight="bold">
        PDF
      </text>
    </svg>
  ),
  focus: (
    <svg
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  ),
  exit: (
    <svg
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  menu: (
    <svg
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  ),
  save: (
    <svg
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <path d="M17 21v-8H7v8M7 3v5h8" />
    </svg>
  ),
  linkedin: (
    <svg
      width="20"
      height="20"
      fill="white"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M19 0H5C2.239 0 0 2.239 0 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5V5c0-2.761-2.238-5-5-5zm-4.46 19h-2.96V10.74h2.96V19zM13.04 8.67h-.04c-.97 0-1.62-.68-1.62-1.52 0-.87.68-1.52 1.66-1.52.99 0 1.61.65 1.62 1.52 0 .84-.68 1.52-1.62 1.52zm6.46 10.33h-2.95V10.74h2.95V19z" />
    </svg>
  ),
  github: (
    <svg
      width="20"
      height="20"
      fill="white"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.84 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.542-1.37-1.322-1.735-1.322-1.735-1.08-.744.084-.73.084-.73 1.195.084 1.835 1.22.183 1.22 1.065.084 1.93-.323 2.4-.593.1-.464.37-.838.67-1.03-.28-.317-.677-.718-1.22-1.034-3.1-.356-6.37-1.56-6.37-6.925 0-1.535.55-2.795 1.45-3.77-.14-.318-.635-1.785.14-3.73 0 0 1.1-.318 3.6-.75.05-.123.1-.245.15-.367.87-.243 1.77-.367 2.67-.367.9 0 1.8.124 2.67.367.05.122.1.244.15.367 2.5 0 3.6.75 3.6.75.777 1.945.282 3.412.14 3.73.9.973 1.45 2.233 1.45 3.77 0 5.37-3.27 6.57-6.38 6.925.52.447.99 1.16.99 2.35 0 1.71-.01 3.09-.01 3.5c0 .32.213.69.825.577C20.565 22.135 24 17.592 24 12.297c0-6.627-5.373-12-12-12z" />
    </svg>
  ),
  instagram: (
    <svg
      width="20"
      height="20"
      fill="white"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 0C8.74 0 8.333.014 7.053.072c-1.17.026-1.92.177-2.448.371-.952.365-1.673.846-2.316 1.491S1.417 4.082 1.052 5.034c-.194.528-.345 1.278-.371 2.448C.014 8.333 0 8.74 0 12s.014 3.667.072 4.947c.026 1.17.177 1.92.371 2.448.365.952.846 1.673 1.491 2.316.645.645 1.366 1.126 2.316 1.491.528.194 1.278.345 2.448.371C8.333 23.986 8.74 24 12 24s3.667-.014 4.947-.072c1.17-.026 1.92-.177 2.448-.371.952-.365 1.673-.846 2.316-1.491.645.645 1.126-1.366 1.491-2.316.194-.528.345-1.278.371-2.448C23.986 15.667 24 15.26 24 12s-.014-3.667-.072-4.947c-.026-1.17-.177-1.92-.371-2.448S22.082 1.417 21.13 1.052c-.528-.194-1.278-.345-2.448-.371C15.667.014 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.025 1.805.163 2.22.326.5-.101.662-.447.723-.636.666-1.467 1.06-2.107 1.06-2.107v-.001c.038-.09.054-.113.133-.181.476-.476 1.09-.912 1.69-1.313.695-.466 1.28-.88 1.656-1.17.4-.317.65-.513.743-.58.364-.256.703-.472 1.009-.693.603-.43.972-.727 1.36-.97.69-.428 1.415-.754 2.156-.994 1.254-.412 2.085-.505 2.27-.516.207-.01.37-.017.51-.017zm0 2.16c2.896 0 3.244.01 4.372.067 1.093.027 1.739.145 2.16.307.423.164.762.364 1.05.649.287.286.487.623.649 1.049.162.423.281 1.068.307 2.16.058 1.128.067 1.476.067 4.372s-.01 3.244-.067 4.372c-.027 1.092-.145 1.739-.307.423-.164-.762-.364-1.05-.649-.287-.286-.487-.623-.649-1.049-.162-.423-.281-1.068-.307-2.16-.058-1.128-.067-1.476-.067-4.372s.01-3.244.067-4.372c.027-1.092.145-1.739.307-2.16.164-.423.364-.762.649-1.05.286-.287.623-.487 1.049-.649.423-.162 1.068-.281 2.16-.307C8.756 2.25 9.104 2.16 12 2.16zM12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12zm0 1.96a4.04 4.04 0 1 1 0 8.08 4.04 4.04 0 0 1 0-8.08zM18.4 5.8a1.44 1.44 0 1 1 0 2.88 1.44 1.44 0 0 1 0-2.88z" />
    </svg>
  ),
};

const App = () => {
  const [editorState, setEditorState] = useState(EditorState.createEmpty());
  const editorRef = useRef(null);
  const previewRef = useRef(null);
  const fileInputRef = useRef(null);
  const [openedFileName, setOpenedFileName] = useState(null);
  const [documents, setDocuments] = useState({}); // {id: {name, content}}
  const [currentDocId, setCurrentDocId] = useState(null);
  const [storageUsed, setStorageUsed] = useState(0);
  const [editLocked, setEditLocked] = useState(false);
  const [syncScroll, setSyncScroll] = useState(false);
  const [docLimitMsg, setDocLimitMsg] = useState("");
  const [documentsLoaded, setDocumentsLoaded] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [isFromLocalStorage, setIsFromLocalStorage] = useState(true);
  const [showDocumentOverlay, setShowDocumentOverlay] = useState(false);

  // Line/column/char count
  const [cursor, setCursor] = useState({ line: 1, col: 0 });
  useEffect(() => {
    const selection = editorState.getSelection();
    const content = editorState.getCurrentContent();
    const blockKey = selection.getStartKey();
    const blockMap = content.getBlockMap();
    let line = 1;
    let col = selection.getStartOffset();
    let found = false;
    blockMap.forEach((block, key) => {
      if (!found) {
        if (key === blockKey) {
          found = true;
        } else {
          line++;
        }
      }
    });
    setCursor({ line, col });
  }, [editorState]);
  const charCount = editorState.getCurrentContent().getPlainText().length;

  // Load documents from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const docs = JSON.parse(stored);
        setDocuments(docs);
        const firstId = Object.keys(docs)[0] || null;
        setCurrentDocId(firstId);
        if (firstId) {
          setEditorState(
            EditorState.createWithContent(
              ContentState.createFromText(docs[firstId].content)
            )
          );
          setOpenedFileName(docs[firstId].name);
        } else {
          setEditorState(EditorState.createEmpty());
          setOpenedFileName(null);
          setIsFromLocalStorage(true);
        }
      } catch (e) {
        console.error("Failed to load documents from localStorage:", e);
        setDocuments({});
        setCurrentDocId(null);
        setEditorState(EditorState.createEmpty());
        setOpenedFileName(null);
        setIsFromLocalStorage(true);
      }
    }
    updateStorageUsage();
    setDocumentsLoaded(true);
  }, []);

  // Save documents to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
    updateStorageUsage();
  }, [documents]);

  // Update storage usage and lock editing if needed
  function updateStorageUsage() {
    const used = new Blob([localStorage.getItem(STORAGE_KEY) || ""]).size;
    setStorageUsed(used);
    setEditLocked(used >= MAX_STORAGE_BYTES);
  }

  // Document CRUD
  function createDocument() {
    if (editLocked) return;
    if (Object.keys(documents).length >= MAX_DOCS) {
      setDocLimitMsg(
        "Document limit reached (10). Delete a document to create a new one."
      );
      return;
    }
    setDocLimitMsg("");
    const id =
      Date.now().toString() + Math.floor(Math.random() * 10000).toString();
    const name = `Untitled Document.md`;
    const newDocs = { ...documents, [id]: { name, content: "" } };
    setDocuments(newDocs);
    setCurrentDocId(id);
    setEditorState(EditorState.createEmpty());
    setOpenedFileName(name);
    setIsFromLocalStorage(true);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newDocs));
  }
  function openDocument(id) {
    setCurrentDocId(id);
    setEditorState(
      EditorState.createWithContent(
        ContentState.createFromText(documents[id].content)
      )
    );
    setOpenedFileName(documents[id].name);
    setIsFromLocalStorage(true);
    setShowDocumentOverlay(false);
  }
  function deleteDocument(id) {
    const newDocs = { ...documents };
    delete newDocs[id];
    setDocuments(newDocs);
    // Immediately persist to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newDocs));
    // If deleted current, switch to another or clear
    if (currentDocId === id) {
      const nextId = Object.keys(newDocs)[0] || null;
      setCurrentDocId(nextId);
      if (nextId) {
        setEditorState(
          EditorState.createWithContent(
            ContentState.createFromText(newDocs[nextId].content)
          )
        );
        setOpenedFileName(newDocs[nextId].name);
      } else {
        setEditorState(EditorState.createEmpty());
        setOpenedFileName(null);
      }
    }
    setDocLimitMsg("");
  }
  function renameDocument(id, newName) {
    const newDocs = {
      ...documents,
      [id]: { ...documents[id], name: newName },
    };
    setDocuments(newDocs);
    if (currentDocId === id) setOpenedFileName(newName);
    // Immediately persist to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newDocs));
  }

  // Save editor changes to current document
  useEffect(() => {
    if (!documentsLoaded) return;
    if (!currentDocId) return;
    setDocuments((docs) => {
      if (!docs[currentDocId]) return docs;
      return {
        ...docs,
        [currentDocId]: {
          ...docs[currentDocId],
          content: editorState.getCurrentContent().getPlainText(),
        },
      };
    });
  }, [editorState, documentsLoaded]);

  // Function to handle explicit saving
  const handleSaveDocument = () => {
    if (!currentDocId || isFromLocalStorage) return;

    // Check if we can add a new document
    if (Object.keys(documents).length >= MAX_DOCS) {
      setDocLimitMsg(
        "Document limit reached (10). Delete a document to save this file."
      );
      return;
    }

    // Check storage limit
    const content = editorState.getCurrentContent().getPlainText();
    const newDocSize = new Blob([content]).size;
    if (storageUsed + newDocSize > MAX_STORAGE_BYTES) {
      setDocLimitMsg("Storage limit reached. Cannot save this file.");
      return;
    }

    // Create new document in localStorage
    const id =
      Date.now().toString() + Math.floor(Math.random() * 10000).toString();
    const newDocs = {
      ...documents,
      [id]: {
        name: openedFileName,
        content: content,
      },
    };

    setDocuments(newDocs);
    setCurrentDocId(id);
    setIsFromLocalStorage(true);
    setDocLimitMsg("");

    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newDocs));
    updateStorageUsage();
  };

  const handleKeyCommand = (command) => {
    if (command === "undo") {
      setEditorState(EditorState.undo(editorState));
      return "handled";
    } else if (command === "redo") {
      setEditorState(EditorState.redo(editorState));
      return "handled";
    }
    return "not-handled";
  };

  const insertMarkdownSyntax = (syntax, isWrap = false) => {
    const currentState = editorState;
    const selection = currentState.getSelection();
    const contentState = currentState.getCurrentContent();

    if (isWrap) {
      // For bold/italic, wrap selected text or insert markers
      const selectedText = contentState
        .getBlockForKey(selection.getStartKey())
        .getText()
        .slice(selection.getStartOffset(), selection.getEndOffset());
      const wrappedText = selectedText
        ? `${syntax}${selectedText}${syntax}`
        : `${syntax}${syntax}`;
      const newContentState = Modifier.replaceText(
        contentState,
        selection,
        wrappedText
      );
      const newEditorState = EditorState.push(
        currentState,
        newContentState,
        "insert-characters"
      );
      // Restore selection around the wrapped text if text was selected
      const startOffset = selection.getStartOffset() + syntax.length;
      const endOffset = selection.getEndOffset() + syntax.length;
      const newSelection = selection.merge({
        anchorOffset: startOffset,
        focusOffset: endOffset,
      });
      setEditorState(EditorState.forceSelection(newEditorState, newSelection));
    } else {
      // For headers/lists, insert at start of selected block(s) if not present
      const blockMap = contentState.getBlockMap();
      const startKey = selection.getStartKey();
      const endKey = selection.getEndKey();
      const blocks = blockMap
        .toSeq()
        .filter((block) => {
          const key = block.getKey();
          return (
            key === startKey ||
            (contentState.getKeyAfter(key) &&
              blockMap.has(contentState.getKeyBefore(key)))
          );
        })
        .filter((block) => {
          const key = block.getKey();
          const afterKey = contentState.getKeyAfter(startKey);
          const beforeKey = contentState.getKeyBefore(endKey);
          return (
            key === startKey ||
            key === endKey ||
            (blockMap.has(afterKey) &&
              blockMap.has(beforeKey) &&
              key >= afterKey &&
              key <= beforeKey)
          );
        })
        .toList();

      let newContentState = contentState;
      let blockDelta = 0; // To adjust selection offset after insertion

      blocks.forEach((block) => {
        const blockKey = block.getKey();
        const blockText = block.getText();

        // Check if the block already starts with a heading syntax (any level)
        const existingHeadingMatch = blockText.match(/^#+\s/);
        if (existingHeadingMatch) {
          // If it already has a heading, remove the old one before inserting the new one
          const rangeToRemove = selection.merge({
            anchorKey: blockKey,
            anchorOffset: 0,
            focusKey: blockKey,
            focusOffset: existingHeadingMatch[0].length,
          });
          newContentState = Modifier.replaceText(
            newContentState,
            rangeToRemove,
            ""
          );
          // Adjust subsequent insertions' positions
          if (blockKey === startKey)
            blockDelta -= existingHeadingMatch[0].length;
        }

        // Check if the block already starts with the *specific* requested syntax
        const specificSyntaxMatch = blockText.startsWith(syntax);

        if (!specificSyntaxMatch) {
          // Insert the new syntax at the beginning of the block
          const insertSelection = selection.merge({
            anchorKey: blockKey,
            anchorOffset: 0,
            focusKey: blockKey,
            focusOffset: 0,
          });
          newContentState = Modifier.insertText(
            newContentState,
            insertSelection,
            syntax
          );
          // Adjust subsequent insertions' positions
          if (blockKey === startKey) blockDelta += syntax.length;
        }
      });

      const newEditorState = EditorState.push(
        currentState,
        newContentState,
        "insert-characters"
      );

      // Attempt to restore the original selection, adjusted for inserted syntax
      const newAnchorOffset =
        selection.getStartOffset() +
        (startKey === selection.getAnchorKey() ? blockDelta : 0);
      const newFocusOffset =
        selection.getEndOffset() +
        (endKey === selection.getFocusKey() ? blockDelta : 0);

      const newSelection = selection.merge({
        anchorOffset: newAnchorOffset,
        focusOffset: newFocusOffset,
      });

      setEditorState(EditorState.forceSelection(newEditorState, newSelection));
    }
  };

  // Handle Enter key for natural list editing
  const handleReturn = (e) => {
    const currentState = editorState;
    const selection = currentState.getSelection();
    const contentState = currentState.getCurrentContent();
    const blockKey = selection.getStartKey();
    const block = contentState.getBlockForKey(blockKey);
    const blockText = block.getText();

    // Smart code block handling
    // 1. If user types only ``` and presses Enter, auto-close code block
    if (/^```\s*$/.test(blockText)) {
      // Insert a new line, a closing ```, and place cursor in between
      const newContentState = Modifier.replaceText(
        contentState,
        selection.merge({ anchorOffset: 0, focusOffset: blockText.length }),
        "```\n\n```"
      );
      // Move cursor to the empty line between the backticks
      const newEditorState = EditorState.push(
        currentState,
        newContentState,
        "insert-characters"
      );
      // Find the position after the first line (after '```\n')
      const afterBlockKey = newContentState.getKeyAfter(blockKey);
      const afterBlock = newContentState.getBlockForKey(afterBlockKey);
      const selectionBetween = selection.merge({
        anchorKey: afterBlockKey,
        anchorOffset: 0,
        focusKey: afterBlockKey,
        focusOffset: 0,
      });
      setEditorState(
        EditorState.forceSelection(newEditorState, selectionBetween)
      );
      return "handled";
    }

    // 2. If inside a code block, pressing Enter just inserts a new line
    // We'll check if the previous or next block is a code block delimiter
    const blocks = contentState.getBlocksAsArray();
    const currentIndex = blocks.findIndex((b) => b.getKey() === blockKey);
    // Find if we're inside a code block
    let insideCodeBlock = false;
    let codeBlockStart = -1;
    for (let i = currentIndex - 1; i >= 0; i--) {
      if (/^```/.test(blocks[i].getText())) {
        codeBlockStart = i;
        break;
      }
    }
    if (codeBlockStart !== -1) {
      // Look for a closing ``` after currentIndex
      let codeBlockEnd = -1;
      for (let i = currentIndex; i < blocks.length; i++) {
        if (/^```/.test(blocks[i].getText()) && i !== codeBlockStart) {
          codeBlockEnd = i;
          break;
        }
      }
      if (codeBlockEnd === -1 || codeBlockEnd > currentIndex) {
        insideCodeBlock = true;
      }
    }
    if (insideCodeBlock) {
      // Let Draft.js handle Enter as a normal new line
      return "not-handled";
    }

    // Ordered list
    const olMatch = blockText.match(/^(\d+)\.\s(.*)$/);
    if (olMatch) {
      if (olMatch[2].length === 0) {
        // Empty list item: exit list
        const newContentState = Modifier.replaceText(
          contentState,
          selection.merge({ anchorOffset: 0, focusOffset: blockText.length }),
          ""
        );
        const newEditorState = EditorState.push(
          currentState,
          newContentState,
          "remove-range"
        );
        setEditorState(
          EditorState.forceSelection(
            newEditorState,
            newContentState.getSelectionAfter()
          )
        );
        return "handled";
      } else {
        // Continue list with next number
        const nextNumber = parseInt(olMatch[1], 10) + 1;
        const newContentState = Modifier.splitBlock(contentState, selection);
        const afterSplitKey = newContentState.getKeyAfter(blockKey);
        const afterSplitBlock = newContentState.getBlockForKey(afterSplitKey);
        const insertSelection = selection.merge({
          anchorKey: afterSplitKey,
          anchorOffset: 0,
          focusKey: afterSplitKey,
          focusOffset: 0,
        });
        const withMarker = Modifier.insertText(
          newContentState,
          insertSelection,
          `${nextNumber}. `
        );
        const newEditorState = EditorState.push(
          currentState,
          withMarker,
          "insert-characters"
        );
        setEditorState(
          EditorState.forceSelection(
            newEditorState,
            withMarker.getSelectionAfter()
          )
        );
        return "handled";
      }
    }
    // Unordered list
    const ulMatch = blockText.match(/^([-*+])\s(.*)$/);
    if (ulMatch) {
      if (ulMatch[2].length === 0) {
        // Empty list item: exit list
        const newContentState = Modifier.replaceText(
          contentState,
          selection.merge({ anchorOffset: 0, focusOffset: blockText.length }),
          ""
        );
        const newEditorState = EditorState.push(
          currentState,
          newContentState,
          "remove-range"
        );
        setEditorState(
          EditorState.forceSelection(
            newEditorState,
            newContentState.getSelectionAfter()
          )
        );
        return "handled";
      } else {
        // Continue list
        const newContentState = Modifier.splitBlock(contentState, selection);
        const afterSplitKey = newContentState.getKeyAfter(blockKey);
        const afterSplitBlock = newContentState.getBlockForKey(afterSplitKey);
        const insertSelection = selection.merge({
          anchorKey: afterSplitKey,
          anchorOffset: 0,
          focusKey: afterSplitKey,
          focusOffset: 0,
        });
        const withMarker = Modifier.insertText(
          newContentState,
          insertSelection,
          `${ulMatch[1]} `
        );
        const newEditorState = EditorState.push(
          currentState,
          withMarker,
          "insert-characters"
        );
        setEditorState(
          EditorState.forceSelection(
            newEditorState,
            withMarker.getSelectionAfter()
          )
        );
        return "handled";
      }
    }
    return "not-handled";
  };

  const handleCustomAction = (action) => {
    if (action === "download") {
      const contentState = editorState.getCurrentContent();
      const text = contentState.getPlainText();
      if (!text.trim()) return; // Don't download if empty
      const blob = new Blob([text], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = openedFileName || "markdown-content.md";
      a.click();
      URL.revokeObjectURL(url);
    } else if (action === "undo") {
      setEditorState(EditorState.undo(editorState));
    } else if (action === "redo") {
      setEditorState(EditorState.redo(editorState));
    } else if (action === "clear") {
      const newContentState = ContentState.createFromText("");
      const newEditorState = EditorState.push(
        editorState,
        newContentState,
        "remove-range"
      );
      setEditorState(newEditorState);
      setOpenedFileName(null);
    }
  };

  // Handle opening a .md file
  const handleOpenFile = (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    setOpenedFileName(file.name);
    setIsFromLocalStorage(false);
    setCurrentDocId(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      setEditorState(
        EditorState.createWithContent(ContentState.createFromText(text))
      );
    };
    reader.readAsText(file);
  };

  const isEditorEmpty = !editorState.getCurrentContent().hasText();

  // Progress bar percent
  const storagePercent = Math.min(
    100,
    Math.round((storageUsed / MAX_STORAGE_BYTES) * 100)
  );

  // Scroll sync logic
  useEffect(() => {
    if (!syncScroll) return;
    const editorDiv =
      editorRef.current && editorRef.current.editor && editorRef.current.editor;
    const previewDiv = previewRef.current;
    if (!editorDiv || !previewDiv) return;
    let isSyncing = false;
    const handleEditorScroll = () => {
      if (!syncScroll || isSyncing) return;
      isSyncing = true;
      const ratio =
        editorDiv.scrollTop / (editorDiv.scrollHeight - editorDiv.clientHeight);
      previewDiv.scrollTop =
        ratio * (previewDiv.scrollHeight - previewDiv.clientHeight);
      setTimeout(() => {
        isSyncing = false;
      }, 10);
    };
    const handlePreviewScroll = () => {
      if (!syncScroll || isSyncing) return;
      isSyncing = true;
      const ratio =
        previewDiv.scrollTop /
        (previewDiv.scrollHeight - previewDiv.clientHeight);
      editorDiv.scrollTop =
        ratio * (editorDiv.scrollHeight - editorDiv.clientHeight);
      setTimeout(() => {
        isSyncing = false;
      }, 10);
    };
    editorDiv.addEventListener("scroll", handleEditorScroll);
    previewDiv.addEventListener("scroll", handlePreviewScroll);
    return () => {
      editorDiv.removeEventListener("scroll", handleEditorScroll);
      previewDiv.removeEventListener("scroll", handlePreviewScroll);
    };
  }, [syncScroll, editorRef, previewRef, editorState]);

  // PDF export logic
  const handleExportPDF = async () => {
    const content = editorState.getCurrentContent().getPlainText();
    if (!content.trim()) return; // Don't export if empty

    // Create a temporary hidden div to render the full markdown content for capture
    const tempDiv = document.createElement("div");
    tempDiv.style.position = "absolute";
    tempDiv.style.top = "-9999px";
    tempDiv.style.width = "calc(2 * 8.5in)"; // Approximate a printable width (e.g., twice A4 width in inches, converted to px)
    tempDiv.style.padding = "1in"; // Add some padding
    tempDiv.style.background = "#fff"; // Ensure white background
    tempDiv.style.color = "#000"; // Ensure black text
    document.body.appendChild(tempDiv);

    // Render the markdown to the temporary div using ReactMarkdown (temporarily)
    // This is a bit tricky with React/ReactDOM. A simpler approach is to directly convert markdown to HTML if ReactMarkdown provides a utility, or use a dedicated markdown-to-html lib, but since ReactMarkdown is already used for rendering, let's try to leverage it or simulate its output structure.
    // For simplicity and direct fix, let's simulate rendering or use a simpler library if available. However, directly rendering React components outside the app root is complex.
    // A more practical approach given the current structure is to let ReactMarkdown render into a temporary div attached to the main app's render tree if possible, or use a separate headless markdown-to-html conversion.

    // Let's try to leverage the existing ReactMarkdown by rendering into the temp div.
    // This requires a bit of ReactDOM work or a different rendering approach.
    // A simpler, more direct approach for fixing the *capture* part is to ensure html2canvas captures the full scrollable height.

    // Let's revert to capturing the previewDiv but ensuring it captures the full height by temporarily adjusting styles if needed, or relying on html2canvas's scroll handling which might be improved in newer versions.
    // Re-evaluating: The issue is likely html2canvas not capturing the scroll. The temporary div approach with full content is robust.
    // To render ReactMarkdown into a temporary div, we can't just append HTML strings because ReactMarkdown is a component.
    // We could use ReactDOM.render into the tempDiv, but that's for older React versions, or create a portal/separate root, which adds complexity.

    // Alternative robust approach without complex React rendering: use a simple markdown-it instance to convert markdown to HTML in the background, then feed that HTML to html2canvas.

    // Let's stick to the initial plan of capturing the previewDiv but trying to ensure it captures full height. This is simpler if we can make html2canvas work.
    // A common way to force full capture is to temporarily expand the scrollable element's height before capture and revert it.

    const previewDiv = previewRef.current;
    if (!previewDiv) return;

    const originalHeight = previewDiv.style.height;
    const originalOverflow = previewDiv.style.overflow;

    // Temporarily expand height and allow overflow to ensure html2canvas captures everything
    previewDiv.style.height = "auto";
    previewDiv.style.overflow = "visible"; // Or just remove overflow to let content dictate height
    previewDiv.style.overflowY = "visible";
    previewDiv.style.overflowX = "visible";

    const canvas = await html2canvas(previewDiv, {
      backgroundColor: "#fff",
      scale: 2,
    });

    // Revert styles
    previewDiv.style.height = originalHeight;
    previewDiv.style.overflow = originalOverflow;
    previewDiv.style.overflowY = "scroll"; // Or whatever your original overflow-y was
    previewDiv.style.overflowX = "hidden"; // Or whatever your original overflow-x was

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a4",
    });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgProps = pdf.getImageProperties(imgData);

    let pdfHeight = (imgProps.height * pageWidth) / imgProps.width;
    let position = 0;

    // Add image to PDF, handle pagination if content is taller than a page
    while (position < pdfHeight) {
      pdf.addImage(imgData, "PNG", 0, position, pageWidth, pdfHeight);
      position -= pageHeight; // Move position up by page height for the next page
      if (position < pdfHeight) {
        // If there's still content, add a new page
        pdf.addPage();
      }
    }

    pdf.save((openedFileName || "markdown-preview") + ".pdf");
  };

  return (
    <div className="w-full h-screen flex flex-row overflow-hidden bg-[#050556]">
      {/* Help Modal */}
      {showHelp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60"
          onClick={() => setShowHelp(false)}
        >
          <div
            className="bg-[#23237a] text-white rounded-lg shadow-lg p-8 max-w-lg w-full relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-2 right-2 text-lg text-[#b2b2b7] hover:text-white"
              onClick={() => setShowHelp(false)}
              aria-label="Close"
            >
              ×
            </button>
            <h2 className="text-xl font-bold mb-4">Markdown Cheatsheet</h2>
            <div className="text-sm font-mono space-y-2">
              <div>
                <b>Headings:</b>
                <br /># H1
                <br />
                ## H2
                <br />
                ### H3
              </div>
              <div>
                <b>Bold:</b> <span className="text-green-300">**bold**</span>
              </div>
              <div>
                <b>Italic:</b> <span className="text-green-300">*italic*</span>
              </div>
              <div>
                <b>Bold &amp; Italic:</b>{" "}
                <span className="text-green-300">***bold italic***</span>
              </div>
              <div>
                <b>Lists:</b>
                <br />- Item
                <br />
                1. Item
              </div>
              <div>
                <b>Code:</b>
                <br />
                Inline: <span className="text-green-300">`code`</span>
                <br />
                Block:
                <br />
                <span className="text-green-300">
                  ```
                  <br />
                  code block
                  <br />
                  ```
                </span>
              </div>
              <div>
                <b>Links:</b>
                <br />
                <span className="text-green-300">
                  [title](https://example.com)
                </span>
              </div>
              <div>
                <b>Images:</b>
                <br />
                <span className="text-green-300">![alt text](image.jpg)</span>
              </div>
              <div>
                <b>Blockquote:</b>
                <br />
                <span className="text-green-300">&gt; quoted text</span>
              </div>
              <div>
                <b>Horizontal Rule:</b>
                <br />
                <span className="text-green-300">---</span>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Sidebar for documents (Visible on md and larger) */}
      {!focusMode && (
        <div className="w-64 bg-[#18186a] border-r border-[#b2b2b7] flex-col md:flex hidden">
          <div className="p-4 border-b border-[#23237a]">
            <h2 className="text-white text-lg font-bold mb-2">Documents</h2>
            {/* Restored New Document button for sidebar on large screens */}
            <button
              onClick={createDocument}
              className={`w-full mb-2 px-2 py-1 rounded bg-[#3b3b99] text-white hover:bg-[#4c4cbb] ${
                editLocked || Object.keys(documents).length >= MAX_DOCS
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}
              disabled={editLocked || Object.keys(documents).length >= MAX_DOCS}
              title={
                Object.keys(documents).length >= MAX_DOCS
                  ? `Document limit reached (${MAX_DOCS}). Delete a document to create a new one.`
                  : "Create a new markdown document"
              }
            >
              New Document
            </button>
            {/* Only show doc limit msg if sidebar is visible */}
            {docLimitMsg && (
              <div className="text-xs text-yellow-400 mb-2 text-center">
                {docLimitMsg}
              </div>
            )}
            {/* Only show storage bar if sidebar is visible */}
            <div className="mb-2">
              <div className="h-2 w-full bg-[#23237a] rounded">
                <div
                  className="h-2 bg-green-500 rounded"
                  style={{ width: `${storagePercent}%` }}
                ></div>
              </div>
              <div className="text-xs text-[#b2b2b7] mt-1 text-center">
                Storage: {(storageUsed / 1024 / 1024).toFixed(2)} MB / 5 MB
              </div>
              {editLocked && (
                <div className="text-xs text-red-400 mt-1 text-center">
                  Storage limit reached! Delete old documents to continue
                  editing.
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1 overflow-y-auto flex-1">
              {Object.entries(documents).map(([id, doc]) => (
                <div
                  key={id}
                  className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer ${
                    id === currentDocId
                      ? "bg-[#23237a] text-white"
                      : "text-[#b2b2b7] hover:bg-[#23237a]"
                  }`}
                  onClick={() => openDocument(id)}
                >
                  <span
                    contentEditable={id === currentDocId}
                    suppressContentEditableWarning
                    onBlur={(e) =>
                      renameDocument(id, e.target.textContent || doc.name)
                    }
                    className="flex-1 outline-none"
                    style={{ minWidth: 0 }}
                  >
                    {doc.name}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteDocument(id);
                    }}
                    className="ml-2 text-xs text-red-400 hover:text-red-600"
                    title="Delete"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* Main editor area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="w-full h-full flex flex-col overflow-hidden bg-[#050556]">
          {/* Hide toolbar and file name bar in focus mode */}
          {!focusMode && (
            <>
              <header className="h-16 flex-shrink-0 flex items-center justify-center border-b border-[#b2b2b7] px-4">
                <h1 className="text-white font-semibold font-serif text-2xl">
                  Markdown Live Editor - Dixanta Nath Shrestha
                </h1>
                {/* Social Media Links */}
                <div className="flex items-center space-x-4 ml-4">
                  <a
                    href="https://www.linkedin.com/in/dixanta-shrestha-b59872232/"
                    target="_blank"
                    rel="noopener noreferrer"
                    title="LinkedIn"
                    className="flex-shrink-0 w-5 h-5"
                  >
                    {ICONS.linkedin}
                  </a>
                  <a
                    href="https://github.com/dixxanta08/"
                    target="_blank"
                    rel="noopener noreferrer"
                    title="GitHub"
                    className="flex-shrink-0 w-5 h-5"
                  >
                    {ICONS.github}
                  </a>
                  <a
                    href="https://www.instagram.com/theonewheredixxantalives/"
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Instagram"
                    className="flex-shrink-0 w-5 h-5"
                  >
                    {ICONS.instagram}
                  </a>
                </div>
              </header>
              <div className="flex items-center justify-between py-2 bg-[#1a1a66] px-4 flex-wrap md:flex-nowrap">
                {/* Left: toolbar icons */}
                <div className="flex items-center space-x-2 flex-wrap">
                  {/* Add button to toggle document overlay on small screens (Moved here) */}
                  <div className="flex flex-col items-center md:hidden">
                    <button
                      onClick={() => setShowDocumentOverlay(true)}
                      className="p-2 bg-[#3b3b99] rounded hover:bg-[#4c4cbb] flex flex-col items-center"
                      title="Show Documents"
                    >
                      <svg
                        width="20"
                        height="20"
                        fill="none"
                        stroke="white"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    </button>
                    <span className="text-xs text-white mt-1">Docs</span>
                  </div>
                  {/* File Operations Group (Rest of the buttons) */}
                  <div className="flex items-center space-x-2 pr-2 border-r border-[#3b3b99]">
                    <div className="flex flex-col items-center">
                      <button
                        onClick={createDocument}
                        className={`p-2 text-white bg-[#3b3b99] rounded hover:bg-[#4c4cbb]${
                          editLocked ||
                          Object.keys(documents).length >= MAX_DOCS
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                        disabled={
                          editLocked ||
                          Object.keys(documents).length >= MAX_DOCS
                        }
                        title={
                          Object.keys(documents).length >= MAX_DOCS
                            ? `Document limit reached (${MAX_DOCS}). Delete a document to create a new one.`
                            : "Create a new markdown document"
                        }
                      >
                        {ICONS.open}
                      </button>
                      <span className="text-xs text-white mt-1">New</span>
                    </div>
                    <input
                      type="file"
                      accept=".md,text/markdown"
                      ref={fileInputRef}
                      style={{ display: "none" }}
                      onChange={handleOpenFile}
                    />
                    <div className="flex flex-col items-center">
                      <button
                        onClick={() =>
                          fileInputRef.current && fileInputRef.current.click()
                        }
                        className="p-2 text-white bg-[#3b3b99] rounded hover:bg-[#4c4cbb]"
                        title="Open Markdown File"
                      >
                        {ICONS.open}
                      </button>
                      <span className="text-xs text-white mt-1">Open</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <button
                        onClick={() => handleCustomAction("download")}
                        className={`p-2 text-white bg-[#3b3b99] rounded hover:bg-[#4c4cbb]${
                          isEditorEmpty ? " opacity-50 cursor-not-allowed" : ""
                        }`}
                        disabled={isEditorEmpty}
                        title="Download Markdown"
                      >
                        {ICONS.download}
                      </button>
                      <span className="text-xs text-white mt-1">Download</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <button
                        onClick={handleExportPDF}
                        className="p-2 text-white bg-[#3b3b99] rounded hover:bg-[#4c4cbb]"
                        title="Export to PDF"
                      >
                        {ICONS.pdf}
                      </button>
                      <span className="text-xs text-white mt-1">PDF</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <button
                        onClick={() => handleCustomAction("clear")}
                        className="p-2 text-white bg-[#3b3b99] rounded hover:bg-[#4c4cbb]"
                        title="Clear Editor"
                      >
                        {ICONS.clear}
                      </button>
                      <span className="text-xs text-white mt-1">Clear</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <button
                        onClick={() => handleSaveDocument()}
                        className={`p-2 text-white bg-[#3b3b99] rounded hover:bg-[#4c4cbb]${
                          !currentDocId ||
                          isFromLocalStorage ||
                          editLocked ||
                          !openedFileName
                            ? " opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                        disabled={
                          !currentDocId ||
                          isFromLocalStorage ||
                          editLocked ||
                          !openedFileName
                        }
                        title={
                          !openedFileName
                            ? "No file opened"
                            : isFromLocalStorage
                            ? "Document already saved"
                            : "Save Document"
                        }
                      >
                        {ICONS.save}
                      </button>
                      <span className="text-xs text-white mt-1">Save</span>
                    </div>
                  </div>

                  {/* Text Formatting Group */}
                  <div className="flex items-center space-x-2 pr-2 border-r border-[#3b3b99]">
                    <div className="flex flex-col items-center">
                      <button
                        onClick={() => insertMarkdownSyntax("**", true)}
                        className="p-2 text-white bg-[#3b3b99] rounded hover:bg-[#4c4cbb]"
                        title="Bold"
                      >
                        {ICONS.bold}
                      </button>
                      <span className="text-xs text-white mt-1">Bold</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <button
                        onClick={() => insertMarkdownSyntax("*", true)}
                        className="p-2 text-white bg-[#3b3b99] rounded hover:bg-[#4c4cbb]"
                        title="Italic"
                      >
                        {ICONS.italic}
                      </button>
                      <span className="text-xs text-white mt-1">Italic</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <button
                        onClick={() => insertMarkdownSyntax("1. ")}
                        className="p-2 text-white bg-[#3b3b99] rounded hover:bg-[#4c4cbb]"
                        title="Ordered List"
                      >
                        {ICONS.ol}
                      </button>
                      <span className="text-xs text-white mt-1">List</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <button
                        onClick={() => insertMarkdownSyntax("- ")}
                        className="p-2 text-white bg-[#3b3b99] rounded hover:bg-[#4c4cbb]"
                        title="Unordered List"
                      >
                        {ICONS.ul}
                      </button>
                      <span className="text-xs text-white mt-1">Bullet</span>
                    </div>
                    {/* Heading Dropdown */}
                    <div className="flex flex-col items-center">
                      <select
                        onChange={(e) => {
                          const level = parseInt(e.target.value, 10);
                          if (level > 0) {
                            insertMarkdownSyntax("#".repeat(level) + " ");
                          }
                          e.target.value = ""; // Reset dropdown after selection
                        }}
                        className="p-2 text-white bg-[#3b3b99] rounded hover:bg-[#4c4cbb] text-xs outline-none cursor-pointer"
                        title="Select Heading Level"
                        value="" // Controlled component
                      >
                        <option value="" disabled hidden>
                          Heading
                        </option>
                        {[1, 2, 3, 4, 5, 6].map((level) => (
                          <option key={level} value={level}>
                            Heading {level}
                          </option>
                        ))}
                      </select>
                      <span className="text-xs text-white mt-1">Heading</span>
                    </div>
                  </div>

                  {/* Undo/Redo Group */}
                  <div className="flex items-center space-x-2 flex-wrap">
                    <div className="flex flex-col items-center">
                      <button
                        onClick={() => handleCustomAction("undo")}
                        className="p-2 text-white bg-[#3b3b99] rounded hover:bg-[#4c4cbb]"
                        title="Undo"
                      >
                        {ICONS.undo}
                      </button>
                      <span className="text-xs text-white mt-1">Undo</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <button
                        onClick={() => handleCustomAction("redo")}
                        className="p-2 text-white bg-[#3b3b99] rounded hover:bg-[#4c4cbb]"
                        title="Redo"
                      >
                        {ICONS.redo}
                      </button>
                      <span className="text-xs text-white mt-1">Redo</span>
                    </div>
                  </div>
                </div>
                {/* Right: sync scroll toggle and help */}
                <div className="flex items-center space-x-4 flex-wrap justify-end">
                  <div className="flex items-center space-x-2">
                    <span className="text-white text-sm">Sync Scroll:</span>
                    <button
                      onClick={() => setSyncScroll((s) => !s)}
                      className="relative w-10 h-6 focus:outline-none"
                      title="Toggle synchronized scrolling"
                      aria-pressed={syncScroll}
                    >
                      <span
                        className={`absolute left-0 top-0 w-10 h-6 rounded-full transition-colors duration-200 ${
                          syncScroll ? "bg-green-600" : "bg-[#3b3b99]"
                        }`}
                      ></span>
                      <span
                        className={`absolute left-0 top-0 w-6 h-6 bg-white rounded-full shadow transform transition-transform duration-200 ${
                          syncScroll ? "translate-x-4" : ""
                        }`}
                        style={{ border: "1px solid #b2b2b7" }}
                      ></span>
                    </button>
                  </div>
                  <div className="flex flex-col items-center">
                    <button
                      onClick={() => setShowHelp(true)}
                      className="p-2 text-white bg-[#3b3b99] rounded hover:bg-[#4c4cbb]"
                      title="Markdown Cheatsheet"
                    >
                      {ICONS.help}
                    </button>
                    <span className="text-xs text-white mt-1">Help</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <button
                      onClick={() => setFocusMode(true)}
                      className="p-2 text-white bg-[#3b3b99] rounded hover:bg-[#4c4cbb]"
                      title="Focus Mode"
                    >
                      {ICONS.focus}
                    </button>
                    <span className="text-xs text-white mt-1">Focus</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-center py-1 bg-[#18186a] border-b border-[#b2b2b7]">
                <span className="text-[#b2b2b7] text-sm font-mono px-2 py-1 rounded bg-[#23237a] min-w-[180px] text-center">
                  {openedFileName
                    ? `Opened: ${openedFileName}`
                    : "No file opened"}
                </span>
              </div>
            </>
          )}

          {/* Document Overlay for small screens */}
          {showDocumentOverlay && !focusMode && (
            <div className="fixed inset-0 z-40 flex flex-col bg-[#18186a] md:hidden">
              <div className="flex items-center justify-between p-4 border-b border-[#23237a]">
                <h2 className="text-white text-lg font-bold">Documents</h2>
                <button
                  onClick={() => setShowDocumentOverlay(false)}
                  className="text-white text-xl"
                >
                  &times;
                </button>
              </div>
              <div className="p-4 border-b border-[#23237a]">
                <button
                  onClick={() => {
                    createDocument();
                    setShowDocumentOverlay(false);
                  }}
                  className={`w-full mb-2 px-2 py-1 rounded bg-[#3b3b99] text-white hover:bg-[#4c4cbb] ${
                    editLocked || Object.keys(documents).length >= MAX_DOCS
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                  disabled={
                    editLocked || Object.keys(documents).length >= MAX_DOCS
                  }
                  title={
                    Object.keys(documents).length >= MAX_DOCS
                      ? `Document limit reached (${MAX_DOCS}). Delete a document to create a new one.`
                      : "Create a new markdown document"
                  }
                >
                  New Document
                </button>
                {docLimitMsg && (
                  <div className="text-xs text-yellow-400 mb-2 text-center">
                    {docLimitMsg}
                  </div>
                )}
                <div className="mb-2">
                  <div className="h-2 w-full bg-[#23237a] rounded">
                    <div
                      className="h-2 bg-green-500 rounded"
                      style={{ width: `${storagePercent}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-[#b2b2b7] mt-1 text-center">
                    Storage: {(storageUsed / 1024 / 1024).toFixed(2)} MB / 5 MB
                  </div>
                  {editLocked && (
                    <div className="text-xs text-red-400 mt-1 text-center">
                      Storage limit reached! Delete old documents to continue
                      editing.
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-1 p-4 overflow-y-auto">
                {Object.entries(documents).map(([id, doc]) => (
                  <div
                    key={id}
                    className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer ${
                      id === currentDocId
                        ? "bg-[#23237a] text-white"
                        : "text-[#b2b2b7] hover:bg-[#23237a]"
                    }`}
                    onClick={() => openDocument(id)}
                  >
                    <span
                      contentEditable={id === currentDocId}
                      suppressContentEditableWarning
                      onBlur={(e) =>
                        renameDocument(id, e.target.textContent || doc.name)
                      }
                      className="flex-1 outline-none"
                      style={{ minWidth: 0 }}
                    >
                      {doc.name}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteDocument(id);
                      }}
                      className="ml-2 text-xs text-red-400 hover:text-red-600"
                      title="Delete"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid sm:grid-cols-2 grid-cols-1 flex-1 gap-0 min-h-0">
            {/* Editor column */}
            <div className="flex flex-col sm:h-full h-[400px] min-h-0 bg-[#050556]">
              <div
                className="flex-1 min-h-0 editor-scroll p-4 border-r border-[#b2b2b7] text-white overflow-y-scroll"
                style={{ background: "#050556" }}
                ref={(el) => {
                  if (editorRef.current) editorRef.current.editor = el;
                }}
              >
                <Editor
                  ref={editorRef}
                  editorState={editorState}
                  onChange={setEditorState}
                  handleKeyCommand={handleKeyCommand}
                  handleReturn={handleReturn}
                  placeholder="Type Markdown here (e.g., ### Heading, **bold**)..."
                  className="h-full bg-transparent !text-white border-none"
                />
              </div>
              {/* Footer for line/col/char count (editor side) */}
              <div className="w-full px-4 py-1 bg-[#23237a] text-[#b2b2b7] text-xs font-mono">
                <span>
                  Line: {cursor.line} | Column: {cursor.col}
                </span>
              </div>
            </div>
            {/* Preview column */}
            <div className="flex flex-col sm:h-full h-[400px] min-h-0">
              <div className="border-b border-[#e0e0e0] px-4 py-2 text-xs font-semibold bg-[#f8f8fa] text-[#23237a] sticky top-0 z-10">
                Preview
              </div>
              <div
                className="flex-1 min-h-0 p-4 preview-scroll bg-white text-[#23237a] markdown-preview border-l border-[#b2b2b7] overflow-y-scroll"
                ref={previewRef}
              >
                <style jsx>{`
                  .markdown-preview h1 {
                    font-size: 2em;
                    font-weight: bold;
                  }
                  .markdown-preview h2 {
                    font-size: 1.5em;
                    font-weight: bold;
                  }
                  .markdown-preview h3 {
                    font-size: 1.2em;
                    font-weight: bold;
                  }
                  .markdown-preview h4 {
                    font-size: 1em;
                    font-weight: bold;
                  }
                  .markdown-preview h5 {
                    font-size: 0.8em;
                    font-weight: bold;
                  }
                  .markdown-preview h6 {
                    font-size: 0.7em;
                    font-weight: bold;
                  }
                  .markdown-preview p {
                    margin-bottom: 1em; /* Add some spacing below paragraphs */
                  }
                `}</style>
                <ReactMarkdown
                  components={{
                    code({ node, inline, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || "");
                      const text = String(children).replace(/\n$/, "");
                      if (!inline && match) {
                        let highlighted = null;
                        try {
                          highlighted = hljs.highlight(text, {
                            language: match[1],
                          }).value;
                        } catch (e) {
                          highlighted = null;
                        }
                        return highlighted ? (
                          <pre>
                            <code
                              dangerouslySetInnerHTML={{ __html: highlighted }}
                              {...props}
                            />
                          </pre>
                        ) : (
                          <pre>
                            <code className={className} {...props}>
                              {text}
                            </code>
                          </pre>
                        );
                      } else {
                        return (
                          <code className={className} {...props}>
                            {children}
                          </code>
                        );
                      }
                    },
                  }}
                >
                  {editorState.getCurrentContent().getPlainText()}
                </ReactMarkdown>
              </div>
              {/* Footer for char count (preview side) */}
              <div className="w-full px-4 py-1 bg-[#23237a] text-[#b2b2b7] text-xs font-mono text-right">
                Characters: {charCount}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* When focusMode is true, hide sidebar and toolbar, show only editor/preview, and add exit button at top right */}
      {focusMode && (
        <button
          onClick={() => setFocusMode(false)}
          className="fixed top-4 right-4 z-[60] p-2 bg-[#23237a] text-white rounded-full shadow-lg hover:bg-[#3b3b99]"
          title="Exit Focus Mode"
        >
          {ICONS.exit}
        </button>
      )}
    </div>
  );
};

export default App;
