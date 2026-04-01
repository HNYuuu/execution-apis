const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

function resolvePath(relPath) {
    return path.join(ROOT, relPath);
}

function readJson(relPath) {
    return JSON.parse(fs.readFileSync(resolvePath(relPath), 'utf8'));
}

function readUtf8(relPath) {
    return fs.readFileSync(resolvePath(relPath), 'utf8');
}

function parseArgs(argv) {
    const args = {
        config: null,
        testCase: null,
        output: null,
    };

    for (let index = 2; index < argv.length; index += 1) {
        const arg = argv[index];
        if (arg === '--config') {
            args.config = argv[index + 1];
            index += 1;
        } else if (arg === '--test-case') {
            args.testCase = argv[index + 1];
            index += 1;
        } else if (arg === '--output') {
            args.output = argv[index + 1];
            index += 1;
        } else {
            throw new Error(`Unknown argument: ${arg}`);
        }
    }

    if (!args.config || !args.testCase || !args.output) {
        throw new Error('Usage: node scripts/engine-mvp-oracle-gate.js --config <path> --test-case <path> --output <path>');
    }

    return args;
}

function parseRuleTable(markdown) {
    const rules = new Map();
    const lines = markdown.split('\n');
    const rowPattern = /^\|\s*`([^`]+)`\s*\|\s*`([^`]+)`\s*\|\s*(.+?)\s*\|\s*([^|]+)\|\s*([^|]+)\|$/;

    for (const line of lines) {
        const match = line.match(rowPattern);
        if (!match) {
            continue;
        }

        const [, id, src, rule, projection, testLayer] = match;
        rules.set(id, {
            id,
            src,
            rule: rule.trim(),
            projection: projection.trim(),
            testLayer: testLayer.trim(),
        });
    }

    return rules;
}

function writeJson(relPath, value) {
    fs.writeFileSync(resolvePath(relPath), JSON.stringify(value, null, 2) + '\n');
}

function main() {
    const args = parseArgs(process.argv);
    const config = readJson(args.config);
    const testCase = readJson(args.testCase);
    const rules = parseRuleTable(readUtf8(config.rulesFile));

    const missingRules = [];
    const unknownHardInvariants = [];

    const scenarios = testCase.scenarios.map((scenario) => {
        const approvedHardInvariants = scenario.hardInvariants.map((ruleId) => {
            const rule = rules.get(ruleId);
            const provenance = config.provenanceByRuleId[ruleId];

            if (!rule) {
                missingRules.push({
                    scenarioId: scenario.scenarioId,
                    ruleId,
                    kind: 'hardInvariant',
                });
                return null;
            }

            if (!provenance) {
                unknownHardInvariants.push({
                    scenarioId: scenario.scenarioId,
                    ruleId,
                    reason: 'Missing provenance entry in config.',
                });
                return null;
            }

            if (provenance.category === 'unknown') {
                unknownHardInvariants.push({
                    scenarioId: scenario.scenarioId,
                    ruleId,
                    reason: 'Hard invariant still classified as unknown.',
                });
            }

            return {
                ruleId,
                provenanceCategory: provenance.category,
                provenanceRationale: provenance.rationale,
                projection: rule.projection,
                testLayer: rule.testLayer,
                ruleText: rule.rule,
                source: rule.src,
            };
        }).filter(Boolean);

        const deferredRules = scenario.deferredRules.map((entry) => {
            const rule = rules.get(entry.ruleId);
            if (!rule) {
                missingRules.push({
                    scenarioId: scenario.scenarioId,
                    ruleId: entry.ruleId,
                    kind: 'deferredRule',
                });
                return null;
            }

            return {
                ruleId: entry.ruleId,
                deferReason: entry.reason,
                projection: rule.projection,
                testLayer: rule.testLayer,
                ruleText: rule.rule,
                source: rule.src,
            };
        }).filter(Boolean);

        return {
            scenarioId: scenario.scenarioId,
            notes: scenario.notes,
            approvedHardInvariants,
            deferredRules,
        };
    });

    const result = {
        taskId: config.taskId,
        generatedAt: new Date().toISOString(),
        status: missingRules.length === 0 && unknownHardInvariants.length === 0 ? 'pass' : 'fail',
        inputs: {
            rulesFile: config.rulesFile,
            configFile: args.config,
            testCaseFile: args.testCase,
        },
        validations: {
            allHardInvariantsHaveKnownProvenance: unknownHardInvariants.length === 0,
            allReferencedRulesExist: missingRules.length === 0,
        },
        summary: {
            scenarioCount: scenarios.length,
            approvedHardInvariantCount: scenarios.reduce((total, scenario) => total + scenario.approvedHardInvariants.length, 0),
            deferredRuleCount: scenarios.reduce((total, scenario) => total + scenario.deferredRules.length, 0),
        },
        scenarios,
        missingRules,
        unknownHardInvariants,
    };

    writeJson(args.output, result);

    if (result.status !== 'pass') {
        console.error(`Engine MVP oracle gate failed. Missing rules: ${missingRules.length}, unknown hard invariants: ${unknownHardInvariants.length}.`);
        process.exitCode = 1;
        return;
    }

    console.log(`Engine MVP oracle gate passed for ${result.summary.scenarioCount} scenarios.`);
    console.log(`Approved hard invariants: ${result.summary.approvedHardInvariantCount}. Deferred rules: ${result.summary.deferredRuleCount}.`);
}

main();
