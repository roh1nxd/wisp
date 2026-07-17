'use client'

import { IDELayout } from '@/components/CodeEditor/IDELayout'
import { FileItem } from '@/components/CodeEditor/FileExplorer'

const sampleFiles: FileItem[] = [
  {
    id: 'contracts',
    name: 'contracts',
    type: 'folder',
    children: [
      {
        id: 'generated',
        name: 'generated',
        type: 'folder',
        children: [
          {
            id: 'src',
            name: 'src',
            type: 'folder',
            children: [
              {
                id: 'lib_rs',
                name: 'lib.rs',
                type: 'file',
                language: 'rust',
                content: `#![no_std]
use usesoroban_sdk::{contract, contractimpl, Env, Symbol};

// Wisp generated contract for "lol"

#[contract]
pub struct Lol;

#[contractimpl]
impl Lol {
  pub fn hello(env: Env) -> Symbol {
    Symbol::short("world")
  }
}`,
              },
            ],
          },
          {
            id: 'cargo_toml',
            name: 'Cargo.toml',
            type: 'file',
            language: 'toml',
            content: `[package]
name = "lol"
version = "0.1.0"
edition = "2021"

[dependencies]
soroban-sdk = "20.5.0"

[dev-dependencies]
soroban-sdk = { version = "20.5.0", features = ["testutils"] }`,
          },
        ],
      },
    ],
  },
  {
    id: 'frontend',
    name: 'frontend',
    type: 'folder',
    children: [
      {
        id: 'readme_md',
        name: 'README.md',
        type: 'file',
        language: 'markdown',
        content: `# Wisp Contract Frontend

This is a Next.js frontend for the Wisp smart contract.

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

## Features

- Connect wallet
- Call contract functions
- View results`,
      },
    ],
  },
]

export default function Page() {
  const sampleOutput = [
    {
      id: '1',
      type: 'info' as const,
      message: 'Compiling Soroban contract...',
      timestamp: new Date(Date.now() - 5000),
    },
    {
      id: '2',
      type: 'log' as const,
      message: '✓ Parsing contracts/generated/src/lib.rs',
      timestamp: new Date(Date.now() - 4500),
    },
    {
      id: '3',
      type: 'log' as const,
      message: '✓ Type checking completed',
      timestamp: new Date(Date.now() - 4000),
    },
    {
      id: '4',
      type: 'log' as const,
      message: '✓ Optimizing WASM bytecode',
      timestamp: new Date(Date.now() - 3500),
    },
    {
      id: '5',
      type: 'warn' as const,
      message: 'Warning: Unused import "Symbol" in module',
      timestamp: new Date(Date.now() - 3000),
    },
    {
      id: '6',
      type: 'log' as const,
      message: '✓ Build succeeded',
      timestamp: new Date(Date.now() - 2500),
    },
    {
      id: '7',
      type: 'info' as const,
      message: 'Output size: 2.4 KB',
      timestamp: new Date(Date.now() - 2000),
    },
    {
      id: '8',
      type: 'log' as const,
      message: 'Contract deployed to: stellar1234...5678',
      timestamp: new Date(Date.now() - 1500),
    },
  ]

  return (
    <IDELayout
      files={sampleFiles}
      status="unaudited"
      output={sampleOutput}
      initialMessages={[
        {
          id: '1',
          role: 'user',
          content: 'Generate a Soroban contract for me',
        },
        {
          id: '2',
          role: 'assistant',
          content: 'I\'ve generated a Soroban contract. Check the contracts/generated/src/lib.rs file to see the code.',
        },
      ]}
      onDeploy={() => console.log('Deploy clicked')}
      onSendMessage={(message) => console.log('Message:', message)}
    />
  )
}
