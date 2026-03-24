import { describe, it, expect } from 'vitest';
import {
  parseMarkdownWithFrontmatter,
  generateFrontmatter,
  extractExcerpt,
  extractKeywords
} from '../../src/archive/parser.js';

describe('parseMarkdownWithFrontmatter', () => {
  it('should parse valid frontmatter', () => {
    const content = `---
protocol: aave
date: 2025-03-01
title: "Aave Analysis"
tags: [DeFi, Lending]
---

# Content here

Some text.`;

    const result = parseMarkdownWithFrontmatter(content);

    expect(result.frontmatter.protocol).toBe('aave');
    expect(result.frontmatter.date).toBe('2025-03-01');
    expect(result.frontmatter.title).toBe('Aave Analysis');
    expect(result.frontmatter.tags).toEqual(['DeFi', 'Lending']);
    expect(result.content).toContain('# Content here');
  });

  it('should handle missing frontmatter', () => {
    const content = `# Just Content

No frontmatter here.`;

    const result = parseMarkdownWithFrontmatter(content);

    expect(result.frontmatter).toEqual({});
    expect(result.content).toBe(content);
  });

  it('should handle empty frontmatter', () => {
    const content = `---
---

Content only.`;

    const result = parseMarkdownWithFrontmatter(content);

    expect(result.frontmatter).toEqual({});
    expect(result.content).toBe('Content only.');
  });

  it('should handle unclosed frontmatter', () => {
    const content = `---
protocol: test
This line never closes

Regular content.`;

    const result = parseMarkdownWithFrontmatter(content);

    // Should treat as no frontmatter
    expect(result.frontmatter).toEqual({});
  });
});

describe('generateFrontmatter', () => {
  it('should generate valid YAML frontmatter', () => {
    const data = {
      protocol: 'aave',
      date: '2025-03-01',
      conviction: 8,
      tags: ['DeFi', 'Lending']
    };

    const result = generateFrontmatter(data);

    expect(result).toContain('---');
    expect(result).toContain('protocol: aave');
    expect(result).toContain('date: 2025-03-01');
    expect(result).toContain('conviction: 8');
    expect(result).toContain('tags: [DeFi, Lending]');
  });

  it('should handle empty arrays', () => {
    const data = {
      protocol: 'test',
      tags: []
    };

    const result = generateFrontmatter(data);

    expect(result).toContain('tags: []');
  });

  it('should skip undefined values', () => {
    const data = {
      protocol: 'test',
      date: undefined,
      conviction: 5
    };

    const result = generateFrontmatter(data);

    expect(result).not.toContain('date');
    expect(result).toContain('protocol: test');
    expect(result).toContain('conviction: 5');
  });
});

describe('extractExcerpt', () => {
  it('should extract and clean excerpt', () => {
    const content = `# Header

**Bold text** and *italic text*.

[Link text](http://example.com)

Regular paragraph here.`;

    const result = extractExcerpt(content, 100);

    expect(result).not.toContain('#');
    expect(result).not.toContain('**');
    expect(result).not.toContain('*');
    expect(result).toContain('Bold text');
    expect(result).toContain('Link text');
  });

  it('should truncate long content', () => {
    const content = 'A'.repeat(300);
    const result = extractExcerpt(content, 100);

    expect(result.length).toBeLessThanOrEqual(103); // 100 + '...'
    expect(result).toContain('...');
  });

  it('should return short content as-is', () => {
    const content = 'Short content';
    const result = extractExcerpt(content, 100);

    expect(result).toBe('Short content');
  });
});

describe('extractKeywords', () => {
  it('should extract header text as keywords', () => {
    const content = `# Main Header

## Subheader One

### Subheader Two`;

    const result = extractKeywords(content);

    expect(result).toContain('main');
    expect(result).toContain('header');
    expect(result).toContain('subheader');
  });

  it('should extract bold text as keywords', () => {
    const content = `This has **important keyword** and **another term**.`;

    const result = extractKeywords(content);

    expect(result).toContain('important');
    expect(result).toContain('keyword');
    expect(result).toContain('another');
    expect(result).toContain('term');
  });

  it('should filter stop words', () => {
    const content = `## The And Or But`;

    const result = extractKeywords(content);

    expect(result).not.toContain('the');
    expect(result).not.toContain('and');
    expect(result).not.toContain('or');
    expect(result).not.toContain('but');
  });

  it('should filter short words', () => {
    const content = `## A To It`;

    const result = extractKeywords(content);

    expect(result).not.toContain('a');
    expect(result).not.toContain('to');
    expect(result).not.toContain('it');
  });
});
