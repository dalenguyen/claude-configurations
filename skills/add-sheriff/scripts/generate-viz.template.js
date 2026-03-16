#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const sheriffDataPath = path.join(__dirname, 'sheriff-graph.json');
const outputPath = path.join(__dirname, 'sheriff-visualization.html');

// Read the Sheriff export data
let sheriffData;
try {
  sheriffData = JSON.parse(fs.readFileSync(sheriffDataPath, 'utf8'));
} catch (error) {
  console.error('Error reading sheriff-graph.json:', error.message);
  console.log('Make sure to run "npm run sheriff:export" first');
  process.exit(1);
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sheriff Dependency Visualization</title>
    <script src="https://unpkg.com/vis-network/standalone/umd/vis-network.min.js"></script>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
        }
        h1 {
            color: #333;
            margin-bottom: 10px;
        }
        .info {
            background: white;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .legend {
            display: flex;
            gap: 20px;
            margin-top: 10px;
            flex-wrap: wrap;
        }
        .legend-item {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .legend-color {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            border: 2px solid #333;
        }
        #network {
            width: 100%;
            height: 700px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .stats {
            background: white;
            padding: 15px;
            border-radius: 8px;
            margin-top: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .stats h3 {
            margin-top: 0;
        }
        .stat-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 10px;
        }
        .stat-item {
            padding: 10px;
            background: #f8f9fa;
            border-radius: 4px;
        }
        .stat-label {
            font-size: 0.9em;
            color: #666;
        }
        .stat-value {
            font-size: 1.5em;
            font-weight: bold;
            color: #2c5282;
        }
        .refresh-notice {
            background: #edf2f7;
            border-left: 4px solid #4299e1;
            padding: 10px 15px;
            margin-top: 20px;
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <h1>🔍 Sheriff Dependency Visualization</h1>

    <div class="info">
        <strong>Project:</strong> TypeScript Project<br>
        <strong>Generated:</strong> ${new Date().toLocaleString()}

        <div class="legend">
            <div class="legend-item">
                <div class="legend-color" style="background: #4299e1;"></div>
                <span>Entry Point</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background: #48bb78;"></div>
                <span>Component</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background: #ed8936;"></div>
                <span>Service</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background: #9f7aea;"></div>
                <span>Model</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background: #a0aec0;"></div>
                <span>Configuration</span>
            </div>
        </div>
    </div>

    <div id="network"></div>

    <div class="stats">
        <h3>📊 Dependency Statistics</h3>
        <div class="stat-grid">
            <div class="stat-item">
                <div class="stat-label">Total Files</div>
                <div class="stat-value" id="totalFiles">-</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Total Dependencies</div>
                <div class="stat-value" id="totalDeps">-</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">External Libraries</div>
                <div class="stat-value" id="externalLibs">-</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Max Dependency Depth</div>
                <div class="stat-value" id="maxDepth">-</div>
            </div>
        </div>
    </div>

    <div class="refresh-notice">
        💡 <strong>Tip:</strong> Run <code>npm run sheriff:viz</code> to regenerate this visualization after code changes
    </div>

    <script>
        const sheriffData = ${JSON.stringify(sheriffData, null, 2)};

        // Helper function to determine node color based on file type
        function getNodeColor(filePath) {
            if (filePath.includes('main.ts') || filePath.includes('index.ts')) return '#4299e1';
            if (filePath.includes('/components/') || filePath.includes('/component.ts')) return '#48bb78';
            if (filePath.includes('/services/') || filePath.includes('/service.ts')) return '#ed8936';
            if (filePath.includes('/models/') || filePath.includes('/model.ts')) return '#9f7aea';
            return '#a0aec0';
        }

        // Helper function to get short label
        function getShortLabel(filePath) {
            const parts = filePath.split('/');
            return parts[parts.length - 1].replace('.ts', '');
        }

        // Build nodes and edges
        const nodes = [];
        const edges = [];
        const allExternalLibs = new Set();
        let totalDeps = 0;

        Object.entries(sheriffData).forEach(([file, data]) => {
            nodes.push({
                id: file,
                label: getShortLabel(file),
                title: \`\${file}\\n\\nModule: \${data.module}\\nTags: \${data.tags.join(', ')}\\nExternal: \${data.externalLibraries.join(', ')}\`,
                color: getNodeColor(file),
                shape: 'box',
                font: { size: 14, color: '#333' }
            });

            data.imports.forEach(importPath => {
                edges.push({
                    from: file,
                    to: importPath,
                    arrows: 'to',
                    color: { color: '#666', highlight: '#2c5282' }
                });
                totalDeps++;
            });

            data.externalLibraries.forEach(lib => allExternalLibs.add(lib));
        });

        // Calculate max depth
        function calculateDepth(file, visited = new Set()) {
            if (visited.has(file)) return 0;
            visited.add(file);

            const imports = sheriffData[file]?.imports || [];
            if (imports.length === 0) return 1;

            return 1 + Math.max(...imports.map(imp => calculateDepth(imp, new Set(visited))));
        }

        const entryPoint = Object.keys(sheriffData)[0];
        const maxDepth = calculateDepth(entryPoint);

        // Update statistics
        document.getElementById('totalFiles').textContent = nodes.length;
        document.getElementById('totalDeps').textContent = totalDeps;
        document.getElementById('externalLibs').textContent = allExternalLibs.size;
        document.getElementById('maxDepth').textContent = maxDepth;

        // Create network visualization
        const container = document.getElementById('network');
        const graphData = { nodes, edges };

        const options = {
            layout: {
                hierarchical: {
                    enabled: true,
                    direction: 'UD',
                    sortMethod: 'directed',
                    levelSeparation: 150,
                    nodeSpacing: 200
                }
            },
            physics: {
                enabled: false
            },
            interaction: {
                hover: true,
                navigationButtons: true,
                keyboard: true
            },
            nodes: {
                borderWidth: 2,
                borderWidthSelected: 3,
                margin: 10,
                font: {
                    size: 14,
                    face: 'Monaco, monospace'
                }
            },
            edges: {
                smooth: {
                    type: 'cubicBezier',
                    forceDirection: 'vertical'
                },
                width: 2
            }
        };

        const network = new vis.Network(container, graphData, options);

        // Add click handler for more details
        network.on('selectNode', function(params) {
            const nodeId = params.nodes[0];
            const data = sheriffData[nodeId];
            if (data) {
                console.log('Selected file:', nodeId);
                console.log('Imports:', data.imports);
                console.log('External libraries:', data.externalLibraries);
            }
        });
    </script>
</body>
</html>
`;

fs.writeFileSync(outputPath, html);
console.log('✅ Sheriff visualization generated successfully!');
console.log('📁 Output:', outputPath);
