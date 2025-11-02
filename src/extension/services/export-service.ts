/**
 * Claude Code Workflow Studio - Export Service
 *
 * Handles workflow export to .claude format
 * Based on: /specs/001-cc-wf-studio/spec.md Export Format Details
 */

import * as path from 'node:path';
import type {
  AskUserQuestionNode,
  BranchNode,
  PromptNode,
  SubAgentNode,
  Workflow,
} from '../../shared/types/workflow-definition';
import type { FileService } from './file-service';

/**
 * Check if any export files already exist
 *
 * @param workflow - Workflow to export
 * @param fileService - File service instance
 * @returns Array of existing file paths (empty if no conflicts)
 */
export async function checkExistingFiles(
  workflow: Workflow,
  fileService: FileService
): Promise<string[]> {
  const existingFiles: string[] = [];
  const workspacePath = fileService.getWorkspacePath();

  const agentsDir = path.join(workspacePath, '.claude', 'agents');
  const commandsDir = path.join(workspacePath, '.claude', 'commands');

  // Check Sub-Agent files
  const subAgentNodes = workflow.nodes.filter((node) => node.type === 'subAgent') as SubAgentNode[];
  for (const node of subAgentNodes) {
    const fileName = nodeNameToFileName(node.name);
    const filePath = path.join(agentsDir, `${fileName}.md`);
    if (await fileService.fileExists(filePath)) {
      existingFiles.push(filePath);
    }
  }

  // Check SlashCommand file
  const commandFileName = nodeNameToFileName(workflow.name);
  const commandFilePath = path.join(commandsDir, `${commandFileName}.md`);
  if (await fileService.fileExists(commandFilePath)) {
    existingFiles.push(commandFilePath);
  }

  return existingFiles;
}

/**
 * Export workflow to .claude format
 *
 * @param workflow - Workflow to export
 * @param fileService - File service instance
 * @returns Array of exported file paths
 */
export async function exportWorkflow(
  workflow: Workflow,
  fileService: FileService
): Promise<string[]> {
  const exportedFiles: string[] = [];
  const workspacePath = fileService.getWorkspacePath();

  // Create .claude directories if they don't exist
  const agentsDir = path.join(workspacePath, '.claude', 'agents');
  const commandsDir = path.join(workspacePath, '.claude', 'commands');

  await fileService.createDirectory(path.join(workspacePath, '.claude'));
  await fileService.createDirectory(agentsDir);
  await fileService.createDirectory(commandsDir);

  // Export Sub-Agent nodes
  const subAgentNodes = workflow.nodes.filter((node) => node.type === 'subAgent') as SubAgentNode[];
  for (const node of subAgentNodes) {
    const fileName = nodeNameToFileName(node.name);
    const filePath = path.join(agentsDir, `${fileName}.md`);
    const content = generateSubAgentFile(node);
    await fileService.writeFile(filePath, content);
    exportedFiles.push(filePath);
  }

  // Export SlashCommand
  const commandFileName = nodeNameToFileName(workflow.name);
  const commandFilePath = path.join(commandsDir, `${commandFileName}.md`);
  const commandContent = generateSlashCommandFile(workflow);
  await fileService.writeFile(commandFilePath, commandContent);
  exportedFiles.push(commandFilePath);

  return exportedFiles;
}

/**
 * Validate .claude file format
 *
 * @param content - File content to validate
 * @param fileType - Type of file ('subAgent' or 'slashCommand')
 * @throws Error if validation fails
 */
export function validateClaudeFileFormat(
  content: string,
  fileType: 'subAgent' | 'slashCommand'
): void {
  // Check if content is non-empty
  if (!content || content.trim().length === 0) {
    throw new Error('File content is empty');
  }

  // Check UTF-8 encoding (string should not contain replacement characters)
  if (content.includes('\uFFFD')) {
    throw new Error('File content contains invalid UTF-8 characters');
  }

  // Check YAML frontmatter format
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    throw new Error('Missing or invalid YAML frontmatter (must start and end with ---)');
  }

  const frontmatterContent = match[1];

  // Validate required fields based on file type
  if (fileType === 'subAgent') {
    if (!frontmatterContent.includes('name:')) {
      throw new Error('Sub-Agent file missing required field: name');
    }
    if (!frontmatterContent.includes('description:')) {
      throw new Error('Sub-Agent file missing required field: description');
    }
    if (!frontmatterContent.includes('model:')) {
      throw new Error('Sub-Agent file missing required field: model');
    }
  } else if (fileType === 'slashCommand') {
    if (!frontmatterContent.includes('description:')) {
      throw new Error('SlashCommand file missing required field: description');
    }
    if (!frontmatterContent.includes('allowed-tools:')) {
      throw new Error('SlashCommand file missing required field: allowed-tools');
    }
  }

  // Check that there's content after frontmatter (prompt body)
  const bodyContent = content.substring(match[0].length).trim();
  if (bodyContent.length === 0) {
    throw new Error('File is missing prompt body content after frontmatter');
  }
}

/**
 * Convert node name to filename
 *
 * @param name - Node name
 * @returns Filename (lowercase, spaces to hyphens)
 */
export function nodeNameToFileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '');
}

/**
 * Generate Sub-Agent configuration file content
 *
 * @param node - Sub-Agent node
 * @returns Markdown content with YAML frontmatter
 */
function generateSubAgentFile(node: SubAgentNode): string {
  const { name, data } = node;
  const agentName = nodeNameToFileName(name);

  // YAML frontmatter
  const frontmatter = ['---', `name: ${agentName}`, `description: ${data.description || name}`];

  // Add optional fields
  if (data.tools && data.tools.length > 0) {
    frontmatter.push(`tools: ${data.tools}`);
  }

  if (data.model) {
    frontmatter.push(`model: ${data.model}`);
  } else {
    frontmatter.push('model: sonnet');
  }

  frontmatter.push('---');
  frontmatter.push('');

  // Prompt body
  const prompt = data.prompt || '';

  return frontmatter.join('\n') + prompt;
}

/**
 * Generate Mermaid flowchart from workflow
 *
 * @param workflow - Workflow definition
 * @returns Mermaid flowchart markdown
 */
function generateMermaidFlowchart(workflow: Workflow): string {
  const { nodes, connections } = workflow;
  const lines: string[] = [];

  // Start Mermaid code block
  lines.push('```mermaid');
  lines.push('flowchart TD');

  // Generate node definitions
  for (const node of nodes) {
    const nodeId = sanitizeNodeId(node.id);
    const nodeType = node.type as string;

    if (nodeType === 'start') {
      lines.push(`    ${nodeId}([開始])`);
    } else if (nodeType === 'end') {
      lines.push(`    ${nodeId}([終了])`);
    } else if (nodeType === 'subAgent') {
      const agentName = node.name || 'Sub-Agent';
      lines.push(`    ${nodeId}[${escapeLabel(agentName)}]`);
    } else if (nodeType === 'askUserQuestion') {
      const askNode = node as AskUserQuestionNode;
      const questionText = askNode.data.questionText || '質問';
      lines.push(`    ${nodeId}{${escapeLabel(`AskUserQuestion:<br/>${questionText}`)}}`);
    } else if (nodeType === 'branch') {
      const branchNode = node as BranchNode;
      const branchType = branchNode.data.branchType === 'conditional' ? 'Branch' : 'Switch';
      lines.push(`    ${nodeId}{${escapeLabel(`${branchType}:<br/>条件分岐`)}}`);
    } else if (nodeType === 'prompt') {
      const promptNode = node as PromptNode;
      // Use first line of prompt or default label
      const promptText = promptNode.data.prompt?.split('\n')[0] || 'Prompt';
      const label = promptText.length > 30 ? `${promptText.substring(0, 27)}...` : promptText;
      lines.push(`    ${nodeId}[${escapeLabel(label)}]`);
    }
  }

  // Add empty line between nodes and connections
  lines.push('');

  // Generate connections
  for (const conn of connections) {
    const fromId = sanitizeNodeId(conn.from);
    const toId = sanitizeNodeId(conn.to);

    // Find source node to determine if it's an AskUserQuestion or Branch with labeled branches
    const sourceNode = nodes.find((n) => n.id === conn.from);

    if (sourceNode?.type === 'askUserQuestion' && conn.fromPort) {
      const askNode = sourceNode as AskUserQuestionNode;

      // AI suggestions or multi-select: single output without labels
      if (askNode.data.useAiSuggestions || askNode.data.multiSelect) {
        lines.push(`    ${fromId} --> ${toId}`);
      } else {
        // Single select with user-defined options: labeled branches by option
        const branchIndex = Number.parseInt(conn.fromPort.replace('branch-', ''), 10);
        const option = askNode.data.options[branchIndex];

        if (option) {
          const label = escapeLabel(option.label);
          lines.push(`    ${fromId} -->|${label}| ${toId}`);
        } else {
          lines.push(`    ${fromId} --> ${toId}`);
        }
      }
    } else if (sourceNode?.type === 'branch' && conn.fromPort) {
      // Extract branch index from fromPort (e.g., "branch-0" -> 0)
      const branchIndex = Number.parseInt(conn.fromPort.replace('branch-', ''), 10);
      const branchNode = sourceNode as BranchNode;
      const branch = branchNode.data.branches[branchIndex];

      if (branch) {
        const label = escapeLabel(branch.label);
        lines.push(`    ${fromId} -->|${label}| ${toId}`);
      } else {
        lines.push(`    ${fromId} --> ${toId}`);
      }
    } else {
      lines.push(`    ${fromId} --> ${toId}`);
    }
  }

  // End Mermaid code block
  lines.push('```');

  return lines.join('\n');
}

/**
 * Sanitize node ID for Mermaid (remove special characters)
 *
 * @param id - Node ID
 * @returns Sanitized ID
 */
function sanitizeNodeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_]/g, '_');
}

/**
 * Escape special characters in Mermaid labels
 *
 * @param label - Label text
 * @returns Escaped label
 */
function escapeLabel(label: string): string {
  return label.replace(/"/g, '#quot;').replace(/\[/g, '#91;').replace(/\]/g, '#93;');
}

/**
 * Generate SlashCommand file content
 *
 * @param workflow - Workflow definition
 * @returns Markdown content with YAML frontmatter
 */
function generateSlashCommandFile(workflow: Workflow): string {
  // YAML frontmatter
  const frontmatter = [
    '---',
    `description: ${workflow.description || workflow.name}`,
    'allowed-tools: Task,AskUserQuestion',
    '---',
    '',
  ].join('\n');

  // Mermaid flowchart
  const mermaidFlowchart = generateMermaidFlowchart(workflow);

  // Workflow execution logic
  const executionLogic = generateWorkflowExecutionLogic(workflow);

  return `${frontmatter}${mermaidFlowchart}\n\n${executionLogic}`;
}

/**
 * Generate workflow execution logic
 *
 * @param workflow - Workflow definition
 * @returns Markdown text with execution instructions
 */
function generateWorkflowExecutionLogic(workflow: Workflow): string {
  const { nodes } = workflow;
  const sections: string[] = [];

  // Introduction
  sections.push('## ワークフロー実行ガイド');
  sections.push('');
  sections.push(
    '上記のMermaidフローチャートに従ってワークフローを実行してください。各ノードタイプの実行方法は以下の通りです。'
  );
  sections.push('');

  // Node type explanations
  sections.push('### ノードタイプ別実行方法');
  sections.push('');
  sections.push('- **四角形のノード**: Taskツールを使用してSub-Agentを実行します');
  sections.push(
    '- **ひし形のノード（AskUserQuestion:...）**: AskUserQuestionツールを使用してユーザーに質問し、回答に応じて分岐します'
  );
  sections.push(
    '- **ひし形のノード（Branch/Switch:...）**: 前処理の結果に応じて自動的に分岐します（詳細セクション参照）'
  );
  sections.push(
    '- **四角形のノード（Promptノード）**: 以下の詳細セクションに記載されたプロンプトを実行します'
  );
  sections.push('');

  // Collect node details by type
  const promptNodes = nodes.filter((n) => (n.type as string) === 'prompt') as PromptNode[];
  const askUserQuestionNodes = nodes.filter(
    (n) => (n.type as string) === 'askUserQuestion'
  ) as AskUserQuestionNode[];
  const branchNodes = nodes.filter((n) => (n.type as string) === 'branch') as BranchNode[];

  // Prompt node details
  if (promptNodes.length > 0) {
    sections.push('### Promptノード詳細');
    sections.push('');
    for (const node of promptNodes) {
      const nodeId = sanitizeNodeId(node.id);
      const label = node.data.prompt?.split('\n')[0] || node.name;
      const displayLabel = label.length > 30 ? `${label.substring(0, 27)}...` : label;
      sections.push(`#### ${nodeId}(${displayLabel})`);
      sections.push('');
      sections.push('```');
      sections.push(node.data.prompt || '');
      sections.push('```');
      sections.push('');

      // Show variables if any
      if (node.data.variables && Object.keys(node.data.variables).length > 0) {
        sections.push('**使用可能な変数:**');
        for (const [key, value] of Object.entries(node.data.variables)) {
          sections.push(`- \`{{${key}}}\`: ${value || '(未設定)'}`);
        }
        sections.push('');
      }
    }
  }

  // AskUserQuestion node details
  if (askUserQuestionNodes.length > 0) {
    sections.push('### AskUserQuestionノード詳細');
    sections.push('');
    for (const node of askUserQuestionNodes) {
      const nodeId = sanitizeNodeId(node.id);
      sections.push(`#### ${nodeId}(${node.data.questionText})`);
      sections.push('');

      // Show selection mode
      if (node.data.useAiSuggestions) {
        sections.push(
          '**選択モード:** AI提案（AIが文脈に基づいて選択肢を動的に生成し、ユーザーに提示します）'
        );
        sections.push('');
        if (node.data.multiSelect) {
          sections.push('**複数選択:** 有効（ユーザーは複数の選択肢を選べます）');
          sections.push('');
        }
      } else if (node.data.multiSelect) {
        sections.push(
          '**選択モード:** 複数選択可能（選択された選択肢のリストが次のノードに渡されます）'
        );
        sections.push('');
        sections.push('**選択肢:**');
        for (const option of node.data.options) {
          sections.push(`- **${option.label}**: ${option.description || '(説明なし)'}`);
        }
        sections.push('');
      } else {
        sections.push('**選択モード:** 単一選択（選択された選択肢に応じて分岐します）');
        sections.push('');
        sections.push('**選択肢:**');
        for (const option of node.data.options) {
          sections.push(`- **${option.label}**: ${option.description || '(説明なし)'}`);
        }
        sections.push('');
      }
    }
  }

  // Branch node details
  if (branchNodes.length > 0) {
    sections.push('### Branchノード詳細');
    sections.push('');
    for (const node of branchNodes) {
      const nodeId = sanitizeNodeId(node.id);
      const branchTypeName = node.data.branchType === 'conditional' ? '2分岐' : '複数分岐';
      sections.push(`#### ${nodeId}(${branchTypeName})`);
      sections.push('');
      sections.push('**分岐条件:**');
      for (const branch of node.data.branches) {
        sections.push(`- **${branch.label}**: ${branch.condition}`);
      }
      sections.push('');
      sections.push(
        '**実行方法**: 前段の処理結果を評価し、上記の条件に基づいて自動的に適切な分岐を選択してください。'
      );
      sections.push('');
    }
  }

  return sections.join('\n');
}
