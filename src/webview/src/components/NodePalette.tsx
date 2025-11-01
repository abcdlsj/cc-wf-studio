/**
 * Claude Code Workflow Studio - Node Palette Component
 *
 * Draggable node templates for Sub-Agent and AskUserQuestion nodes
 * Based on: /specs/001-cc-wf-studio/plan.md
 */

import type React from 'react';
import { useWorkflowStore } from '../stores/workflow-store';

/**
 * NodePalette Component
 */
export const NodePalette: React.FC = () => {
  const { addNode } = useWorkflowStore();

  const handleAddSubAgent = () => {
    const newNode = {
      id: `agent-${Date.now()}`,
      type: 'subAgent' as const,
      position: { x: 250, y: 100 },
      data: {
        description: 'New Sub-Agent',
        prompt: 'Enter your prompt here',
        model: 'sonnet' as const,
        outputPorts: 1,
      },
    };
    addNode(newNode);
  };

  const handleAddAskUserQuestion = () => {
    const newNode = {
      id: `question-${Date.now()}`,
      type: 'askUserQuestion' as const,
      position: { x: 250, y: 300 },
      data: {
        questionText: 'New Question',
        options: [
          { label: 'Option 1', description: 'First option' },
          { label: 'Option 2', description: 'Second option' },
        ],
        outputPorts: 2,
      },
    };
    addNode(newNode);
  };

  const handleAddPromptNode = () => {
    const newNode = {
      id: `prompt-${Date.now()}`,
      type: 'prompt' as const,
      position: { x: 350, y: 200 },
      data: {
        label: 'New Prompt',
        prompt: 'Enter your prompt template here.\n\nYou can use variables like {{variableName}}.',
        variables: {},
      },
    };
    addNode(newNode);
  };

  return (
    <div
      className="node-palette"
      style={{
        width: '200px',
        height: '100%',
        backgroundColor: 'var(--vscode-sideBar-background)',
        borderRight: '1px solid var(--vscode-panel-border)',
        padding: '16px',
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div
        style={{
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--vscode-foreground)',
          marginBottom: '16px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        Node Palette
      </div>

      {/* Sub-Agent Node Button */}
      <button
        type="button"
        onClick={handleAddSubAgent}
        style={{
          width: '100%',
          padding: '12px',
          marginBottom: '12px',
          backgroundColor: 'var(--vscode-button-background)',
          color: 'var(--vscode-button-foreground)',
          border: '1px solid var(--vscode-button-border)',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 500,
          textAlign: 'left',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--vscode-button-hoverBackground)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--vscode-button-background)';
        }}
      >
        <div style={{ fontWeight: 600 }}>Sub-Agent</div>
        <div
          style={{
            fontSize: '11px',
            color: 'var(--vscode-descriptionForeground)',
          }}
        >
          Execute a specialized task
        </div>
      </button>

      {/* AskUserQuestion Node Button */}
      <button
        type="button"
        onClick={handleAddAskUserQuestion}
        style={{
          width: '100%',
          padding: '12px',
          marginBottom: '12px',
          backgroundColor: 'var(--vscode-button-background)',
          color: 'var(--vscode-button-foreground)',
          border: '1px solid var(--vscode-button-border)',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 500,
          textAlign: 'left',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--vscode-button-hoverBackground)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--vscode-button-background)';
        }}
      >
        <div style={{ fontWeight: 600 }}>Ask User Question</div>
        <div
          style={{
            fontSize: '11px',
            color: 'var(--vscode-descriptionForeground)',
          }}
        >
          Branch based on user choice
        </div>
      </button>

      {/* Prompt Node Button */}
      <button
        type="button"
        onClick={handleAddPromptNode}
        style={{
          width: '100%',
          padding: '12px',
          backgroundColor: 'var(--vscode-button-background)',
          color: 'var(--vscode-button-foreground)',
          border: '1px solid var(--vscode-button-border)',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 500,
          textAlign: 'left',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--vscode-button-hoverBackground)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--vscode-button-background)';
        }}
      >
        <div style={{ fontWeight: 600 }}>Prompt</div>
        <div
          style={{
            fontSize: '11px',
            color: 'var(--vscode-descriptionForeground)',
          }}
        >
          Template with variables
        </div>
      </button>

      {/* Instructions */}
      <div
        style={{
          marginTop: '24px',
          padding: '12px',
          backgroundColor: 'var(--vscode-textBlockQuote-background)',
          border: '1px solid var(--vscode-textBlockQuote-border)',
          borderRadius: '4px',
          fontSize: '11px',
          color: 'var(--vscode-descriptionForeground)',
          lineHeight: '1.5',
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: '8px' }}>💡 Quick Start</div>
        <ul style={{ margin: 0, paddingLeft: '16px' }}>
          <li>Click a node to add it to the canvas</li>
          <li>Drag nodes to reposition them</li>
          <li>Connect nodes by dragging from output to input handles</li>
          <li>Select a node to edit its properties</li>
        </ul>
      </div>
    </div>
  );
};
