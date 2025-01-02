import React, { useEffect, useCallback, useState, useRef, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Editor } from '@tiptap/react';
import { EditorContainer, EditorToolbar, EditorContent, ToolbarButton } from './TextEditor.styles';
import { IContent, IContentMetadata, ContentType, MAX_CONTENT_SIZE } from '../../../interfaces/content.interface';
import { validateGazetteContent } from '../../../utils/validation.util';

// Editor configuration constants
const MAX_TEXT_LENGTH = 500;
const AUTOSAVE_DELAY = 1000;
const SUPPORTED_LANGUAGES = ['en', 'he', 'fr', 'es', 'de', 'ru', 'ar', 'zh'] as const;

interface TextEditorProps {
  content?: string;
  language: typeof SUPPORTED_LANGUAGES[number];
  onChange: (content: string) => void;
  maxLength?: number;
  placeholder?: string;
  isRTL?: boolean;
  ariaLabel?: string;
  onValidationError?: (error: string) => void;
}

const TextEditor: React.FC<TextEditorProps> = memo(({
  content = '',
  language = 'en',
  onChange,
  maxLength = MAX_TEXT_LENGTH,
  placeholder = '',
  isRTL = false,
  ariaLabel = 'Text editor',
  onValidationError
}) => {
  const { t } = useTranslation();
  const editorRef = useRef<Editor | null>(null);
  const [editorContent, setEditorContent] = useState(content);
  const [isValid, setIsValid] = useState(true);
  const autosaveTimeoutRef = useRef<NodeJS.Timeout>();

  // Initialize editor with RTL support and accessibility features
  useEffect(() => {
    editorRef.current = new Editor({
      content: editorContent,
      autofocus: false,
      extensions: [
        // Add required TipTap extensions here
      ],
      editorProps: {
        attributes: {
          'aria-label': ariaLabel,
          'aria-multiline': 'true',
          'aria-required': 'true',
          'dir': isRTL ? 'rtl' : 'ltr',
          'lang': language,
          'role': 'textbox',
        }
      }
    });

    return () => {
      editorRef.current?.destroy();
    };
  }, [language, isRTL, ariaLabel]);

  // Handle content changes with validation
  const handleTextChange = useCallback((newContent: string) => {
    setEditorContent(newContent);

    // Clear existing autosave timeout
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    // Validate content
    try {
      const contentToValidate: Partial<IContent> = {
        type: ContentType.TEXT,
        metadata: {
          description: newContent,
          originalLanguage: language,
          size: new Blob([newContent]).size
        } as IContentMetadata
      };

      validateGazetteContent(contentToValidate);
      setIsValid(true);

      // Autosave after delay
      autosaveTimeoutRef.current = setTimeout(() => {
        onChange(newContent);
      }, AUTOSAVE_DELAY);

    } catch (error) {
      setIsValid(false);
      onValidationError?.(error instanceof Error ? error.message : 'Invalid content');
    }
  }, [language, onChange, onValidationError]);

  // Handle formatting commands
  const handleFormatting = useCallback((command: string) => {
    if (!editorRef.current) return;

    switch (command) {
      case 'bold':
        editorRef.current.chain().focus().toggleBold().run();
        break;
      case 'italic':
        editorRef.current.chain().focus().toggleItalic().run();
        break;
      case 'underline':
        editorRef.current.chain().focus().toggleUnderline().run();
        break;
      // Add more formatting commands as needed
    }
  }, []);

  return (
    <EditorContainer
      role="application"
      aria-label={t('editor.container.label')}
    >
      <EditorToolbar role="toolbar" aria-label={t('editor.toolbar.label')}>
        <ToolbarButton
          onClick={() => handleFormatting('bold')}
          aria-label={t('editor.toolbar.bold')}
          aria-pressed={editorRef.current?.isActive('bold')}
        >
          B
        </ToolbarButton>
        <ToolbarButton
          onClick={() => handleFormatting('italic')}
          aria-label={t('editor.toolbar.italic')}
          aria-pressed={editorRef.current?.isActive('italic')}
        >
          I
        </ToolbarButton>
        <ToolbarButton
          onClick={() => handleFormatting('underline')}
          aria-label={t('editor.toolbar.underline')}
          aria-pressed={editorRef.current?.isActive('underline')}
        >
          U
        </ToolbarButton>
      </EditorToolbar>

      <EditorContent
        language={language}
        aria-invalid={!isValid}
        aria-errormessage={!isValid ? t('editor.validation.error') : undefined}
      >
        {editorRef.current?.options.element}
      </EditorContent>

      <div role="status" aria-live="polite" className="sr-only">
        {!isValid && t('editor.validation.error')}
      </div>
    </EditorContainer>
  );
});

TextEditor.displayName = 'TextEditor';

export default TextEditor;