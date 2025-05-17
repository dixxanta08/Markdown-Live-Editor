# Markdown Live Editor

## Description

This project is a real-time Markdown Live Editor built with React. It allows users to write and preview Markdown content simultaneously. The editor supports various Markdown syntax, document management using Local Storage, file operations (opening, downloading, exporting to PDF), and provides a clean, responsive user interface.

## Features

- **Real-time Preview:** See your Markdown rendered instantly as you type.
- **Toolbar Formatting:** Buttons and a dropdown for easily applying common Markdown syntax:
  - Headings (H1-H6)
  - Bold
  - Italic
  - Ordered Lists
  - Unordered Lists
- **Natural List Editing:** Pressing Enter within a list item automatically creates the next item with the correct marker/number. Pressing Enter on an empty list item exits the list.
- **Smart Code Block Handling:** Automatically closes triple backtick code blocks when you type ``` and press Enter. Pressing Enter inside a code block creates a new line within the block.
- **Syntax Highlighting:** Code blocks in the preview are highlighted using highlight.js, with graceful fallback for unknown languages.
- **Document Management (Local Storage):**
  - Create new documents.
  - Open existing documents from a list.
  - Rename documents.
  - Delete documents.
  - Documents are automatically saved and loaded from your browser's Local Storage.
  - Includes a storage usage indicator and a limit (5MB) to prevent excessive local storage use. Editing is locked if the storage limit is reached.
- **File Operations:**
  - **Open:** Load a `.md` file from your local device into the editor.
  - **Download:** Download the current editor content as a `.md` file.
  - **Export to PDF:** Export the rendered preview content as a PDF document.
- **Help Modal:** A modal containing a Markdown cheatsheet for quick syntax reference.
- **Focus Mode:** A distraction-free mode that hides the sidebar and toolbar, showing only the editor and preview.
- **Responsive Design:**
  - Sidebar converts to an overlay menu on small screens.
  - Editor and Preview stack vertically on small screens with fixed heights.
  - Toolbar layout adjusts to fit smaller screens.
- **Sync Scroll:** Synchronizes scrolling between the editor and the preview panes.
- **Status Bar:** Displays current line, column, and character count in the editor/preview footer.
- **Social Media Links:** Links to the creator's social media profiles in the header.

## Libraries Used

- **React:** JavaScript library for building user interfaces.
- **Draft.js:** A framework for building rich text editors in React.
- **ReactMarkdown:** A React component to render Markdown.
- **highlight.js:** JavaScript library for syntax highlighting.
- **jsPDF:** A client-side JavaScript library for generating PDFs.
- **html2canvas:** A JavaScript library that allows taking screenshots of webpages or parts of them.
- **Tailwind CSS:** A utility-first CSS framework for styling (used via classes in JSX).
