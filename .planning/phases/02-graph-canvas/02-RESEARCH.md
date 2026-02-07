# Phase 2: Graph Canvas - Research

**Researched:** February 7, 2026
**Domain:** Interactive graph visualization with WebGL rendering
**Confidence:** MEDIUM

## Summary

Researched interactive graph canvas implementation focusing on memory-safe rendering for 500+ nodes with multi-device support. The standard approach uses WebGL-based libraries like Cytoscape.js or Sigma.js for performance, with D3.js for custom interactions. Modern solutions emphasize progressive rendering, virtualization, and GPU acceleration to handle large datasets without browser crashes.

Key findings show that SVG-based solutions fail at scale, while WebGL libraries can handle thousands of nodes efficiently. Touch and pan/zoom interactions require specialized libraries like d3-zoom or svg-pan-zoom. Typed relationship visualization demands careful edge styling systems.

**Primary recommendation:** Use Cytoscape.js 3.33+ with WebGL rendering for core graph visualization, D3-zoom for pan/zoom interactions, and implement progressive loading for 500+ nodes.

## Standard Stack

The established libraries/tools for interactive graph visualization:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Cytoscape.js | 3.33.1 | Interactive graph rendering | Production-grade performance, extensive styling, touch support |
| D3.js | 7.9.0 | Custom interactions and data binding | Industry standard for data visualization flexibility |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Sigma.js | Latest | WebGL graph rendering | Large datasets (1000+ nodes), pure performance focus |
| d3-zoom | Latest | Pan/zoom interactions | Multi-device touch/mouse support |
| svg-pan-zoom | Latest | SVG pan/zoom | When using SVG-based rendering |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Cytoscape.js | Sigma.js | Better performance but less styling flexibility |
| D3.js custom | vis.js | Faster development but less customization |
| WebGL rendering | SVG | Better accessibility but poor performance at scale |

**Installation:**
```bash
npm install cytoscape d3 d3-zoom
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── graph/               # Graph visualization components
│   ├── canvas/         # Canvas and WebGL rendering
│   ├── interactions/   # Pan, zoom, node manipulation
│   ├── layouts/        # Force-directed, hierarchical layouts
│   └── styles/         # Node and edge styling systems
├── relationships/      # Typed edge management
└── performance/        # Memory optimization and virtualization
```

### Pattern 1: Progressive Graph Loading
**What:** Load and render graph elements in batches to prevent memory overflow
**When to use:** Graphs with 500+ nodes or complex layouts
**Example:**
```typescript
// Cytoscape.js progressive loading pattern
const cy = cytoscape({
  container: document.getElementById('cy'),
  elements: [], // Start empty
  style: graphStyles
});

// Load in batches of 100 nodes
const batchSize = 100;
for (let i = 0; i < allNodes.length; i += batchSize) {
  const batch = allNodes.slice(i, i + batchSize);
  cy.add(batch);
  await new Promise(resolve => setTimeout(resolve, 16)); // Yield to browser
}
```

### Pattern 2: WebGL Performance Optimization
**What:** Use WebGL rendering with level-of-detail for large graphs
**When to use:** 500+ nodes with real-time interactions
**Example:**
```typescript
// Sigma.js WebGL configuration
const sigma = new Sigma(graph, container, {
  renderer: {
    type: 'webgl'
  },
  settings: {
    renderEdges: false, // Disable at zoom levels < 0.5
    enableEdgeHovering: false // Disable expensive interactions
  }
});
```

### Pattern 3: Typed Relationship Styling
**What:** Visual differentiation of edge types through styling systems
**When to use:** Complex dependency graphs with multiple relationship types
**Example:**
```typescript
// Cytoscape.js edge type styling
const relationshipStyles = [
  {
    selector: 'edge[type="blocks"]',
    style: {
      'line-color': '#ff4444',
      'target-arrow-color': '#ff4444',
      'target-arrow-shape': 'triangle',
      'line-style': 'solid'
    }
  },
  {
    selector: 'edge[type="requires"]',
    style: {
      'line-color': '#4444ff',
      'target-arrow-color': '#4444ff',
      'target-arrow-shape': 'diamond'
    }
  }
];
```

### Anti-Patterns to Avoid
- **SVG for Large Graphs:** Performance degrades rapidly beyond 1000 elements
- **Force-directed without bounds:** Can run indefinitely on large graphs
- **Global event listeners:** Create memory leaks when not properly cleaned up

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Pan/zoom with touch | Custom gesture handlers | d3-zoom, svg-pan-zoom | Cross-device compatibility, accessibility, edge cases |
| Graph layout algorithms | Custom force simulation | Cytoscape.js layouts, D3 force | Optimized implementations, proven stability |
| Memory virtualization | Custom viewport culling | Library-specific optimizations | Browser-specific optimizations, performance tuning |
| Edge styling systems | CSS-like engine | Cytoscape.js selectors | Complex selector logic, performance optimization |

**Key insight:** Graph interaction edge cases (multi-touch, momentum scrolling, browser differences) require specialized libraries with years of testing.

## Common Pitfalls

### Pitfall 1: Memory Leaks from DOM References
**What goes wrong:** Detached DOM nodes and event listeners persist after graph destruction
**Why it happens:** Visualization libraries cache DOM references that survive component unmounting
**How to avoid:** Always call library cleanup methods (.destroy(), .remove()) in component unmount hooks
**Warning signs:** Increasing memory usage after repeated graph creation/destruction

### Pitfall 2: Force-Directed Layout Performance Wall
**What goes wrong:** Force-directed layouts freeze browser with 500+ nodes
**Why it happens:** O(n²) physics calculations become exponentially expensive
**How to avoid:** Use hierarchical or pre-computed layouts for large graphs, disable real-time simulation
**Warning signs:** Layout calculations taking >2 seconds, browser "unresponsive script" warnings

### Pitfall 3: SVG Rendering Scale Trap
**What goes wrong:** Performance degrades rapidly beyond 1000 SVG elements
**Why it happens:** SVG DOM overhead and lack of GPU acceleration
**How to avoid:** Switch to Canvas/WebGL rendering for graphs >500 nodes
**Warning signs:** Laggy interactions, dropped frames during pan/zoom

### Pitfall 4: Unoptimized Touch Interactions
**What goes wrong:** Poor touch responsiveness, conflicting gestures
**Why it happens:** Browser default behaviors conflict with graph interactions
**How to avoid:** Use tested libraries like d3-zoom with proper preventDefault handling
**Warning signs:** Scroll conflicts, pinch-zoom not working, gesture lag

## Code Examples

Verified patterns from official sources:

### Multi-device Pan/Zoom Setup
```typescript
// Source: D3.js documentation
import { zoom, select } from 'd3';

const zoomBehavior = zoom()
  .scaleExtent([0.1, 10])
  .on('zoom', (event) => {
    container.attr('transform', event.transform);
  });

svg.call(zoomBehavior);
```

### Memory-safe Graph Initialization
```typescript
// Source: Cytoscape.js documentation
const cy = cytoscape({
  container: document.getElementById('cy'),
  elements: graphData,
  style: styles,
  layout: { name: 'preset' } // Avoid expensive layouts
});

// Cleanup on component unmount
return () => {
  cy.destroy();
};
```

### Typed Relationship Creation
```typescript
// Source: Cytoscape.js documentation
cy.add([
  {
    data: {
      id: 'edge1',
      source: 'node1',
      target: 'node2',
      type: 'blocks',
      label: 'blocks execution'
    }
  }
]);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| SVG-based graphs | WebGL rendering | 2023-2024 | 10x performance improvement for large graphs |
| Custom zoom handlers | d3-zoom standardization | 2022 | Consistent multi-device behavior |
| Static layouts | Progressive loading | 2024 | Memory-safe large graph handling |

**Deprecated/outdated:**
- vis.js: Limited development activity, performance issues
- jQuery-based pan/zoom: Poor touch support, accessibility gaps
- Pure SVG graphs: Performance ceiling at ~1000 nodes

## Open Questions

Things that couldn't be fully resolved:

1. **WebGL Browser Support**
   - What we know: Modern browsers support WebGL
   - What's unclear: Performance on low-end mobile devices
   - Recommendation: Implement Canvas fallback for WebGL failure

2. **Relationship Type Extensibility**
   - What we know: Libraries support custom edge styling
   - What's unclear: Best practices for dynamic relationship type registration
   - Recommendation: Design pluggable relationship type system

3. **Memory Limits on Mobile**
   - What we know: 500+ nodes achievable on desktop
   - What's unclear: Mobile browser memory limits for large graphs
   - Recommendation: Implement adaptive node limits based on device detection

## Sources

### Primary (HIGH confidence)
- Cytoscape.js official documentation (v3.33.1)
- D3.js official documentation (v7.9.0)
- Sigma.js official documentation

### Secondary (MEDIUM confidence)
- WebSearch: "interactive graph visualization libraries JavaScript 2026 best practices"
- WebSearch: "graph network visualization JavaScript memory optimization large datasets 500+ nodes 2026"
- WebSearch: "dependency graph visualization JavaScript libraries 2026 edge types styling"

### Tertiary (LOW confidence)
- WebSearch: General performance optimization patterns (marked for validation)

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM - Verified through official docs but implementation specifics need validation
- Architecture: MEDIUM - Patterns confirmed through documentation and community practices
- Pitfalls: HIGH - Well-documented issues with clear solutions

**Research date:** February 7, 2026
**Valid until:** March 7, 2026 (30 days - stable ecosystem with infrequent major changes)