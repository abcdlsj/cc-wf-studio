/**
 * Claude Code Workflow Studio - Property Panel Component
 *
 * Property editor for selected nodes
 * Based on: /specs/001-cc-wf-studio/plan.md
 */

import type {
  AskUserQuestionData,
  BranchNodeData,
  SubAgentData,
} from '@shared/types/workflow-definition';
import type React from 'react';
import type { Node } from 'reactflow';
import { useWorkflowStore } from '../stores/workflow-store';
import type { PromptNodeData } from '../types/node-types';
import { extractVariables } from '../utils/template-utils';

/**
 * PropertyPanel Component
 */
export const PropertyPanel: React.FC = () => {
  const { nodes, selectedNodeId, updateNodeData, setNodes } = useWorkflowStore();

  // Find the selected node
  const selectedNode = nodes.find((node) => node.id === selectedNodeId);

  if (!selectedNode) {
    return (
      <div
        className="property-panel"
        style={{
          width: '300px',
          height: '100%',
          backgroundColor: 'var(--vscode-sideBar-background)',
          borderLeft: '1px solid var(--vscode-panel-border)',
          padding: '16px',
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            fontSize: '13px',
            color: 'var(--vscode-descriptionForeground)',
            textAlign: 'center',
            marginTop: '24px',
          }}
        >
          Select a node to edit its properties
        </div>
      </div>
    );
  }

  return (
    <div
      className="property-panel"
      style={{
        width: '300px',
        height: '100%',
        backgroundColor: 'var(--vscode-sideBar-background)',
        borderLeft: '1px solid var(--vscode-panel-border)',
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
        Properties
      </div>

      {/* Node Type Badge */}
      <div
        style={{
          fontSize: '11px',
          color: 'var(--vscode-descriptionForeground)',
          backgroundColor: 'var(--vscode-badge-background)',
          padding: '4px 8px',
          borderRadius: '3px',
          display: 'inline-block',
          marginBottom: '16px',
        }}
      >
        {selectedNode.type === 'subAgent'
          ? 'Sub-Agent'
          : selectedNode.type === 'askUserQuestion'
            ? 'Ask User Question'
            : selectedNode.type === 'branch'
              ? 'Branch Node'
              : selectedNode.type === 'prompt'
                ? 'Prompt Node'
                : selectedNode.type === 'start'
                  ? 'Start Node'
                  : selectedNode.type === 'end'
                    ? 'End Node'
                    : 'Unknown'}
      </div>

      {/* Node Name (only for subAgent, askUserQuestion, branch, and prompt types) */}
      {(selectedNode.type === 'subAgent' ||
        selectedNode.type === 'askUserQuestion' ||
        selectedNode.type === 'branch' ||
        selectedNode.type === 'prompt') && (
        <div style={{ marginBottom: '16px' }}>
          <label
            htmlFor="node-name-input"
            style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--vscode-foreground)',
              marginBottom: '6px',
            }}
          >
            Node Name
          </label>
          <input
            id="node-name-input"
            type="text"
            value={selectedNode.data.name || selectedNode.id}
            onChange={(e) => {
              const newName = e.target.value;
              setNodes(
                nodes.map((n) =>
                  n.id === selectedNode.id ? { ...n, data: { ...n.data, name: newName } } : n
                )
              );
            }}
            className="nodrag"
            placeholder="Enter node name"
            style={{
              width: '100%',
              padding: '6px 8px',
              backgroundColor: 'var(--vscode-input-background)',
              color: 'var(--vscode-input-foreground)',
              border: '1px solid var(--vscode-input-border)',
              borderRadius: '2px',
              fontSize: '13px',
            }}
          />
          <div
            style={{
              fontSize: '11px',
              color: 'var(--vscode-descriptionForeground)',
              marginTop: '4px',
            }}
          >
            Used for exported file name (e.g., "data-analysis")
          </div>
        </div>
      )}

      {/* Render properties based on node type */}
      {selectedNode.type === 'subAgent' ? (
        <SubAgentProperties
          node={selectedNode as Node<SubAgentData>}
          updateNodeData={updateNodeData}
        />
      ) : selectedNode.type === 'askUserQuestion' ? (
        <AskUserQuestionProperties
          node={selectedNode as Node<AskUserQuestionData>}
          updateNodeData={updateNodeData}
        />
      ) : selectedNode.type === 'branch' ? (
        <BranchProperties
          node={selectedNode as Node<BranchNodeData>}
          updateNodeData={updateNodeData}
        />
      ) : selectedNode.type === 'prompt' ? (
        <PromptProperties
          node={selectedNode as Node<PromptNodeData>}
          updateNodeData={updateNodeData}
        />
      ) : selectedNode.type === 'start' || selectedNode.type === 'end' ? (
        <div
          style={{
            padding: '12px',
            backgroundColor: 'var(--vscode-textBlockQuote-background)',
            border: '1px solid var(--vscode-textBlockQuote-border)',
            borderRadius: '4px',
            fontSize: '12px',
            color: 'var(--vscode-descriptionForeground)',
          }}
        >
          {selectedNode.type === 'start'
            ? 'Start node marks the beginning of the workflow. It cannot be deleted and has no editable properties.'
            : 'End node marks the completion of the workflow. It cannot be deleted and has no editable properties.'}
        </div>
      ) : (
        <div
          style={{
            padding: '12px',
            backgroundColor: 'var(--vscode-errorBackground)',
            border: '1px solid var(--vscode-errorBorder)',
            borderRadius: '4px',
            fontSize: '12px',
            color: 'var(--vscode-errorForeground)',
          }}
        >
          Unknown node type: {selectedNode.type}
        </div>
      )}
    </div>
  );
};

/**
 * Sub-Agent Properties Editor
 */
const SubAgentProperties: React.FC<{
  node: Node<SubAgentData>;
  updateNodeData: (nodeId: string, data: Partial<unknown>) => void;
}> = ({ node, updateNodeData }) => {
  const data = node.data;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Description */}
      <div>
        <label
          htmlFor="description-input"
          style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--vscode-foreground)',
            marginBottom: '6px',
          }}
        >
          Description
        </label>
        <input
          id="description-input"
          type="text"
          value={data.description}
          onChange={(e) => updateNodeData(node.id, { description: e.target.value })}
          className="nodrag"
          style={{
            width: '100%',
            padding: '6px 8px',
            backgroundColor: 'var(--vscode-input-background)',
            color: 'var(--vscode-input-foreground)',
            border: '1px solid var(--vscode-input-border)',
            borderRadius: '2px',
            fontSize: '13px',
          }}
        />
      </div>

      {/* Prompt */}
      <div>
        <label
          htmlFor="prompt-textarea"
          style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--vscode-foreground)',
            marginBottom: '6px',
          }}
        >
          Prompt
        </label>
        <textarea
          id="prompt-textarea"
          value={data.prompt}
          onChange={(e) => updateNodeData(node.id, { prompt: e.target.value })}
          className="nodrag"
          rows={6}
          style={{
            width: '100%',
            padding: '6px 8px',
            backgroundColor: 'var(--vscode-input-background)',
            color: 'var(--vscode-input-foreground)',
            border: '1px solid var(--vscode-input-border)',
            borderRadius: '2px',
            fontSize: '13px',
            fontFamily: 'var(--vscode-editor-font-family)',
            resize: 'vertical',
          }}
        />
      </div>

      {/* Model */}
      <div>
        <label
          htmlFor="model-select"
          style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--vscode-foreground)',
            marginBottom: '6px',
          }}
        >
          Model
        </label>
        <select
          id="model-select"
          value={data.model || 'sonnet'}
          onChange={(e) =>
            updateNodeData(node.id, { model: e.target.value as 'sonnet' | 'opus' | 'haiku' })
          }
          className="nodrag"
          style={{
            width: '100%',
            padding: '6px 8px',
            backgroundColor: 'var(--vscode-input-background)',
            color: 'var(--vscode-input-foreground)',
            border: '1px solid var(--vscode-input-border)',
            borderRadius: '2px',
            fontSize: '13px',
          }}
        >
          <option value="sonnet">Sonnet</option>
          <option value="opus">Opus</option>
          <option value="haiku">Haiku</option>
        </select>
      </div>

      {/* Tools */}
      <div>
        <label
          htmlFor="tools-input"
          style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--vscode-foreground)',
            marginBottom: '6px',
          }}
        >
          Tools (comma-separated)
        </label>
        <input
          id="tools-input"
          type="text"
          value={data.tools || ''}
          onChange={(e) => updateNodeData(node.id, { tools: e.target.value })}
          placeholder="e.g., Read,Write,Bash"
          className="nodrag"
          style={{
            width: '100%',
            padding: '6px 8px',
            backgroundColor: 'var(--vscode-input-background)',
            color: 'var(--vscode-input-foreground)',
            border: '1px solid var(--vscode-input-border)',
            borderRadius: '2px',
            fontSize: '13px',
          }}
        />
        <div
          style={{
            fontSize: '11px',
            color: 'var(--vscode-descriptionForeground)',
            marginTop: '4px',
          }}
        >
          Leave empty for all tools
        </div>
      </div>
    </div>
  );
};

/**
 * AskUserQuestion Properties Editor
 */
/**
 * Generate a unique ID for an option
 */
const generateOptionId = (): string => {
  return `opt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

const AskUserQuestionProperties: React.FC<{
  node: Node<AskUserQuestionData>;
  updateNodeData: (nodeId: string, data: Partial<unknown>) => void;
}> = ({ node, updateNodeData }) => {
  const data = node.data;

  // Ensure all options have IDs (for backward compatibility)
  const normalizedOptions = data.options.map((opt) => ({
    ...opt,
    id: opt.id || generateOptionId(),
  }));

  // Update data if any option was missing an ID
  if (normalizedOptions.some((opt, i) => opt.id !== data.options[i].id)) {
    updateNodeData(node.id, { options: normalizedOptions });
  }

  const handleAddOption = () => {
    const newOptions = [
      ...normalizedOptions,
      {
        id: generateOptionId(),
        label: `Option ${normalizedOptions.length + 1}`,
        description: 'New option',
      },
    ];
    updateNodeData(node.id, {
      options: newOptions,
      outputPorts: newOptions.length,
    });
  };

  const handleRemoveOption = (index: number) => {
    if (normalizedOptions.length <= 2) return; // Minimum 2 options
    const newOptions = normalizedOptions.filter((_, i) => i !== index);
    updateNodeData(node.id, {
      options: newOptions,
      outputPorts: newOptions.length,
    });
  };

  const handleUpdateOption = (index: number, field: 'label' | 'description', value: string) => {
    const newOptions = normalizedOptions.map((opt, i) =>
      i === index ? { ...opt, [field]: value } : opt
    );
    updateNodeData(node.id, { options: newOptions });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Question Text */}
      <div>
        <label
          htmlFor="question-text-input"
          style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--vscode-foreground)',
            marginBottom: '6px',
          }}
        >
          Question
        </label>
        <textarea
          id="question-text-input"
          value={data.questionText}
          onChange={(e) => updateNodeData(node.id, { questionText: e.target.value })}
          className="nodrag"
          rows={3}
          style={{
            width: '100%',
            padding: '6px 8px',
            backgroundColor: 'var(--vscode-input-background)',
            color: 'var(--vscode-input-foreground)',
            border: '1px solid var(--vscode-input-border)',
            borderRadius: '2px',
            fontSize: '13px',
            resize: 'vertical',
          }}
        />
      </div>

      {/* Multi-Select Toggle */}
      <div>
        <label
          htmlFor="multi-select-checkbox"
          style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--vscode-foreground)',
            cursor: 'pointer',
            gap: '8px',
          }}
        >
          <input
            id="multi-select-checkbox"
            type="checkbox"
            checked={data.multiSelect || false}
            onChange={(e) => {
              const isMultiSelect = e.target.checked;
              updateNodeData(node.id, {
                multiSelect: isMultiSelect,
                outputPorts: isMultiSelect ? 1 : normalizedOptions.length,
              });
            }}
            className="nodrag"
            style={{
              cursor: 'pointer',
            }}
          />
          <span>Multiple Selection</span>
        </label>
        <div
          style={{
            fontSize: '11px',
            color: 'var(--vscode-descriptionForeground)',
            marginTop: '4px',
            marginLeft: '24px',
          }}
        >
          {data.multiSelect
            ? 'User can select multiple options (outputs selected list)'
            : 'User selects one option (branches to corresponding node)'}
        </div>
      </div>

      {/* AI Suggestions Toggle */}
      <div>
        <label
          htmlFor="ai-suggestions-checkbox"
          style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--vscode-foreground)',
            cursor: 'pointer',
            gap: '8px',
          }}
        >
          <input
            id="ai-suggestions-checkbox"
            type="checkbox"
            checked={data.useAiSuggestions || false}
            onChange={(e) => {
              const useAiSuggestions = e.target.checked;
              updateNodeData(node.id, {
                useAiSuggestions,
                outputPorts: 1, // AI suggestions always use single output
                options: useAiSuggestions ? [] : normalizedOptions, // Clear options when AI mode enabled
              });
            }}
            className="nodrag"
            style={{
              cursor: 'pointer',
            }}
          />
          <span>AI Suggests Options</span>
        </label>
        <div
          style={{
            fontSize: '11px',
            color: 'var(--vscode-descriptionForeground)',
            marginTop: '4px',
            marginLeft: '24px',
          }}
        >
          {data.useAiSuggestions
            ? 'AI will dynamically generate options based on context'
            : 'Manually define options below'}
        </div>
      </div>

      {/* Options */}
      {!data.useAiSuggestions && (
        <div>
          <div
            style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--vscode-foreground)',
              marginBottom: '6px',
            }}
          >
            Options ({normalizedOptions.length}/4)
          </div>

          {normalizedOptions.map((option, index) => (
            <div
              key={option.id}
              style={{
                marginBottom: '12px',
                padding: '12px',
                backgroundColor: 'var(--vscode-editor-background)',
                border: '1px solid var(--vscode-panel-border)',
                borderRadius: '4px',
              }}
            >
              <div
                style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}
              >
                <span style={{ fontSize: '11px', fontWeight: 600 }}>Option {index + 1}</span>
                {normalizedOptions.length > 2 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(index)}
                    className="nodrag"
                    style={{
                      padding: '2px 6px',
                      fontSize: '10px',
                      backgroundColor: 'var(--vscode-button-secondaryBackground)',
                      color: 'var(--vscode-button-secondaryForeground)',
                      border: 'none',
                      borderRadius: '2px',
                      cursor: 'pointer',
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
              <input
                type="text"
                value={option.label}
                onChange={(e) => handleUpdateOption(index, 'label', e.target.value)}
                placeholder="Label"
                className="nodrag"
                style={{
                  width: '100%',
                  padding: '4px 6px',
                  marginBottom: '6px',
                  backgroundColor: 'var(--vscode-input-background)',
                  color: 'var(--vscode-input-foreground)',
                  border: '1px solid var(--vscode-input-border)',
                  borderRadius: '2px',
                  fontSize: '12px',
                }}
              />
              <input
                type="text"
                value={option.description}
                onChange={(e) => handleUpdateOption(index, 'description', e.target.value)}
                placeholder="Description"
                className="nodrag"
                style={{
                  width: '100%',
                  padding: '4px 6px',
                  backgroundColor: 'var(--vscode-input-background)',
                  color: 'var(--vscode-input-foreground)',
                  border: '1px solid var(--vscode-input-border)',
                  borderRadius: '2px',
                  fontSize: '12px',
                }}
              />
            </div>
          ))}

          {normalizedOptions.length < 4 && (
            <button
              type="button"
              onClick={handleAddOption}
              className="nodrag"
              style={{
                width: '100%',
                padding: '8px',
                backgroundColor: 'var(--vscode-button-secondaryBackground)',
                color: 'var(--vscode-button-secondaryForeground)',
                border: '1px solid var(--vscode-button-border)',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              + Add Option
            </button>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Prompt Properties Editor
 */
const PromptProperties: React.FC<{
  node: Node<PromptNodeData>;
  updateNodeData: (nodeId: string, data: Partial<unknown>) => void;
}> = ({ node, updateNodeData }) => {
  const data = node.data;

  // プロンプトから変数を抽出
  const variables = extractVariables(data.prompt);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Label */}
      <div>
        <label
          htmlFor="label-input"
          style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--vscode-foreground)',
            marginBottom: '6px',
          }}
        >
          Label
        </label>
        <input
          id="label-input"
          type="text"
          value={data.label || ''}
          onChange={(e) => updateNodeData(node.id, { label: e.target.value })}
          className="nodrag"
          placeholder="Enter label"
          style={{
            width: '100%',
            padding: '6px 8px',
            backgroundColor: 'var(--vscode-input-background)',
            color: 'var(--vscode-input-foreground)',
            border: '1px solid var(--vscode-input-border)',
            borderRadius: '2px',
            fontSize: '13px',
          }}
        />
      </div>

      {/* Prompt Template */}
      <div>
        <label
          htmlFor="prompt-textarea"
          style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--vscode-foreground)',
            marginBottom: '6px',
          }}
        >
          Prompt Template
        </label>
        <textarea
          id="prompt-textarea"
          value={data.prompt}
          onChange={(e) => updateNodeData(node.id, { prompt: e.target.value })}
          className="nodrag"
          rows={8}
          placeholder="Enter prompt template with {{variables}}"
          style={{
            width: '100%',
            padding: '6px 8px',
            backgroundColor: 'var(--vscode-input-background)',
            color: 'var(--vscode-input-foreground)',
            border: '1px solid var(--vscode-input-border)',
            borderRadius: '2px',
            fontSize: '13px',
            fontFamily: 'var(--vscode-editor-font-family)',
            resize: 'vertical',
          }}
        />
        <div
          style={{
            fontSize: '11px',
            color: 'var(--vscode-descriptionForeground)',
            marginTop: '4px',
          }}
        >
          Use {'{{variableName}}'} syntax for dynamic values
        </div>
      </div>

      {/* Detected Variables */}
      {variables.length > 0 && (
        <div>
          <div
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--vscode-foreground)',
              marginBottom: '6px',
            }}
          >
            Detected Variables ({variables.length})
          </div>
          <div
            style={{
              padding: '8px',
              backgroundColor: 'var(--vscode-textBlockQuote-background)',
              border: '1px solid var(--vscode-textBlockQuote-border)',
              borderRadius: '4px',
            }}
          >
            {variables.map((varName) => (
              <div
                key={varName}
                style={{
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  color: 'var(--vscode-foreground)',
                  marginBottom: '4px',
                }}
              >
                • {`{{${varName}}}`}
              </div>
            ))}
          </div>
          <div
            style={{
              fontSize: '11px',
              color: 'var(--vscode-descriptionForeground)',
              marginTop: '4px',
            }}
          >
            Variables will be substituted at runtime
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Branch Properties Editor
 */
const BranchProperties: React.FC<{
  node: Node<BranchNodeData>;
  updateNodeData: (nodeId: string, data: Partial<unknown>) => void;
}> = ({ node, updateNodeData }) => {
  const data = node.data;

  // Ensure all branches have IDs (for backward compatibility)
  const normalizedBranches = data.branches.map((branch) => ({
    ...branch,
    id: branch.id || generateBranchId(),
  }));

  // Update data if any branch was missing an ID
  if (normalizedBranches.some((branch, i) => branch.id !== data.branches[i].id)) {
    updateNodeData(node.id, { branches: normalizedBranches });
  }

  const handleAddBranch = () => {
    const newBranches = [
      ...normalizedBranches,
      {
        id: generateBranchId(),
        label: `Branch ${normalizedBranches.length + 1}`,
        condition: '新しい条件',
      },
    ];
    updateNodeData(node.id, {
      branches: newBranches,
      outputPorts: newBranches.length,
    });
  };

  const handleRemoveBranch = (index: number) => {
    if (normalizedBranches.length <= 2) return; // Minimum 2 branches
    const newBranches = normalizedBranches.filter((_, i) => i !== index);
    updateNodeData(node.id, {
      branches: newBranches,
      outputPorts: newBranches.length,
    });
  };

  const handleUpdateBranch = (index: number, field: 'label' | 'condition', value: string) => {
    const newBranches = normalizedBranches.map((branch, i) =>
      i === index ? { ...branch, [field]: value } : branch
    );
    updateNodeData(node.id, { branches: newBranches });
  };

  const handleChangeBranchType = (newType: 'conditional' | 'switch') => {
    if (newType === 'conditional' && normalizedBranches.length > 2) {
      // Trim to 2 branches for conditional
      updateNodeData(node.id, {
        branchType: newType,
        branches: normalizedBranches.slice(0, 2),
        outputPorts: 2,
      });
    } else {
      updateNodeData(node.id, { branchType: newType });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Branch Type */}
      <div>
        <label
          htmlFor="branch-type-select"
          style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--vscode-foreground)',
            marginBottom: '6px',
          }}
        >
          Branch Type
        </label>
        <select
          id="branch-type-select"
          value={data.branchType}
          onChange={(e) => handleChangeBranchType(e.target.value as 'conditional' | 'switch')}
          className="nodrag"
          style={{
            width: '100%',
            padding: '6px 8px',
            backgroundColor: 'var(--vscode-input-background)',
            color: 'var(--vscode-input-foreground)',
            border: '1px solid var(--vscode-input-border)',
            borderRadius: '2px',
            fontSize: '13px',
          }}
        >
          <option value="conditional">Conditional (2-way)</option>
          <option value="switch">Switch (Multi-way)</option>
        </select>
        <div
          style={{
            fontSize: '11px',
            color: 'var(--vscode-descriptionForeground)',
            marginTop: '4px',
          }}
        >
          {data.branchType === 'conditional' ? '2つの分岐（True/False）' : '複数の分岐（2-N分岐）'}
        </div>
      </div>

      {/* Branches */}
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
          }}
        >
          <div
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--vscode-foreground)',
            }}
          >
            Branches ({normalizedBranches.length})
          </div>
          {(data.branchType === 'switch' || normalizedBranches.length < 2) && (
            <button
              type="button"
              onClick={handleAddBranch}
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                backgroundColor: 'var(--vscode-button-background)',
                color: 'var(--vscode-button-foreground)',
                border: '1px solid var(--vscode-button-border)',
                borderRadius: '2px',
                cursor: 'pointer',
              }}
            >
              + Add Branch
            </button>
          )}
        </div>

        {normalizedBranches.map((branch, index) => (
          <div
            key={branch.id}
            style={{
              padding: '12px',
              marginBottom: '8px',
              backgroundColor: 'var(--vscode-textBlockQuote-background)',
              border: '1px solid var(--vscode-textBlockQuote-border)',
              borderRadius: '4px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px',
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--vscode-descriptionForeground)',
                }}
              >
                Branch {index + 1}
              </span>
              {normalizedBranches.length > 2 && (
                <button
                  type="button"
                  onClick={() => handleRemoveBranch(index)}
                  style={{
                    padding: '2px 6px',
                    fontSize: '11px',
                    backgroundColor: 'var(--vscode-button-secondaryBackground)',
                    color: 'var(--vscode-button-secondaryForeground)',
                    border: 'none',
                    borderRadius: '2px',
                    cursor: 'pointer',
                  }}
                >
                  Remove
                </button>
              )}
            </div>

            {/* Label */}
            <div style={{ marginBottom: '8px' }}>
              <label
                htmlFor={`branch-label-${index}`}
                style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--vscode-foreground)',
                  marginBottom: '4px',
                }}
              >
                Label
              </label>
              <input
                id={`branch-label-${index}`}
                type="text"
                value={branch.label}
                onChange={(e) => handleUpdateBranch(index, 'label', e.target.value)}
                className="nodrag"
                placeholder="e.g., Success, Error"
                style={{
                  width: '100%',
                  padding: '4px 6px',
                  backgroundColor: 'var(--vscode-input-background)',
                  color: 'var(--vscode-input-foreground)',
                  border: '1px solid var(--vscode-input-border)',
                  borderRadius: '2px',
                  fontSize: '12px',
                }}
              />
            </div>

            {/* Condition */}
            <div>
              <label
                htmlFor={`branch-condition-${index}`}
                style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--vscode-foreground)',
                  marginBottom: '4px',
                }}
              >
                Condition (自然言語)
              </label>
              <textarea
                id={`branch-condition-${index}`}
                value={branch.condition}
                onChange={(e) => handleUpdateBranch(index, 'condition', e.target.value)}
                className="nodrag"
                rows={2}
                placeholder="e.g., 前の処理が成功した場合"
                style={{
                  width: '100%',
                  padding: '4px 6px',
                  backgroundColor: 'var(--vscode-input-background)',
                  color: 'var(--vscode-input-foreground)',
                  border: '1px solid var(--vscode-input-border)',
                  borderRadius: '2px',
                  fontSize: '12px',
                  resize: 'vertical',
                }}
              />
            </div>
          </div>
        ))}

        <div
          style={{
            fontSize: '11px',
            color: 'var(--vscode-descriptionForeground)',
            marginTop: '8px',
          }}
        >
          Minimum 2 branches required
        </div>
      </div>
    </div>
  );
};

/**
 * Generate unique branch ID
 */
function generateBranchId(): string {
  return `branch_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
