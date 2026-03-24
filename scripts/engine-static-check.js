const fs = require('fs');
const path = require('path');
const { issueGroups } = require('./engine-static-check-data');

const ROOT = process.cwd();

function readUtf8(relPath) {
    return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function countIndent(line) {
    const match = line.match(/^ */);
    return match ? match[0].length : 0;
}

function extractBlockByLine(text, predicate, stopAt) {
    const lines = text.split('\n');
    const startIndex = lines.findIndex((line) => predicate(line));
    if (startIndex === -1) {
        return null;
    }

    const collected = [lines[startIndex]];
    for (let index = startIndex + 1; index < lines.length; index += 1) {
        const line = lines[index];
        if (stopAt(line)) {
            break;
        }
        collected.push(line);
    }
    return collected.join('\n');
}

function extractTopLevelSchemaBlock(text, schemaName) {
    return extractBlockByLine(
        text,
        (line) => line === `${schemaName}:`,
        (line) => countIndent(line) === 0 && /^[A-Za-z0-9_]+:$/.test(line),
    );
}

function extractYamlPropertyBlock(schemaBlock, propertyName) {
    return extractBlockByLine(
        schemaBlock,
        (line) => line === `    ${propertyName}:`,
        (line) => {
            if (line.trim() === '') {
                return false;
            }
            return countIndent(line) === 4 && /^[A-Za-z0-9_]+:$/.test(line.trim());
        },
    );
}

function extractMethodBlock(text, methodName) {
    return extractBlockByLine(
        text,
        (line) => line === `- name: ${methodName}`,
        (line) => line.startsWith('- name: '),
    );
}

function extractMethodParamBlock(methodBlock, paramName) {
    return extractBlockByLine(
        methodBlock,
        (line) => line === `    - name: ${paramName}`,
        (line) => {
            if (line.trim() === '') {
                return false;
            }
            const indent = countIndent(line);
            return (indent === 4 && line.trimStart().startsWith('- name: ')) || indent === 2;
        },
    );
}

function schemaPropertyIsRequired(schemaBlock, propertyName) {
    const lines = schemaBlock.split('\n');
    const startIndex = lines.findIndex((line) => line === '  required:');
    if (startIndex === -1) {
        return false;
    }

    for (let index = startIndex + 1; index < lines.length; index += 1) {
        const line = lines[index];
        if (line.trim() === '') {
            continue;
        }
        const indent = countIndent(line);
        if (indent <= 2) {
            break;
        }
        if (line === `    - ${propertyName}`) {
            return true;
        }
    }

    return false;
}

function blockAllowsExplicitNull(block) {
    if (!block) {
        return false;
    }

    return [
        /nullable:\s*true/,
        /type:\s*null\b/,
        /type:\s*['"]null['"]/,
        /\$ref:\s*['"]#\/components\/schemas\/notFound['"]/,
        /\$ref:\s*#\/components\/schemas\/notFound\b/,
        /\btype:\s*\[[^\]]*null[^\]]*\]/,
    ].some((pattern) => pattern.test(block));
}

function nullabilityDescription(block, required) {
    if (blockAllowsExplicitNull(block)) {
        return 'explicitly nullable';
    }
    return required ? 'required and non-null' : 'optional but non-null';
}

function parseJsonCodeBlocks(text) {
    const blocks = [];
    const pattern = /```json\s*([\s\S]*?)```/g;
    let match = pattern.exec(text);

    while (match) {
        try {
            blocks.push(JSON.parse(match[1]));
        } catch (error) {
            blocks.push({
                __parseError: error.message,
            });
        }
        match = pattern.exec(text);
    }

    return blocks;
}

function parseInteractiveRequestBlocks(text) {
    const blocks = [];
    const pattern = /<InteractiveRequest request=\{"([\s\S]*?)"\}\s*\/>/g;
    let match = pattern.exec(text);

    while (match) {
        try {
            const decoded = JSON.parse(`"${match[1]}"`);
            blocks.push(JSON.parse(decoded));
        } catch (error) {
            blocks.push({
                __parseError: error.message,
            });
        }
        match = pattern.exec(text);
    }

    return blocks;
}

function extractMethodExampleBlocks(methodBlock) {
    const lines = methodBlock.split('\n');
    const examplesStart = lines.findIndex((line) => line === '  examples:');
    if (examplesStart === -1) {
        return [];
    }

    const examples = [];
    let current = null;

    for (let index = examplesStart + 1; index < lines.length; index += 1) {
        const line = lines[index];
        const indent = countIndent(line);
        if (indent <= 2) {
            break;
        }

        if (indent === 4 && line.trimStart().startsWith('- name: ')) {
            if (current) {
                examples.push(current);
            }
            current = {
                name: line.trim().slice(8),
                lines: [line],
            };
            continue;
        }

        if (current) {
            current.lines.push(line);
        }
    }

    if (current) {
        examples.push(current);
    }

    return examples;
}

function normalizeIndentedBlock(lines) {
    const filtered = lines.slice();
    while (filtered.length > 0 && filtered[0].trim() === '') {
        filtered.shift();
    }
    while (filtered.length > 0 && filtered[filtered.length - 1].trim() === '') {
        filtered.pop();
    }
    return filtered.map((line) => line.trimEnd()).join('\n');
}

function stripCommonIndent(text) {
    const lines = text.split('\n').filter((line) => line.trim() !== '');
    if (lines.length === 0) {
        return '';
    }

    const minIndent = Math.min(...lines.map((line) => countIndent(line)));
    return lines.map((line) => line.slice(minIndent)).join('\n');
}

function parseYamlishScalar(value) {
    const trimmed = value.trim();
    if (trimmed === 'null') {
        return null;
    }
    if (trimmed === '[]') {
        return [];
    }
    if (trimmed === '{}') {
        return {};
    }
    if (trimmed === 'true') {
        return true;
    }
    if (trimmed === 'false') {
        return false;
    }
    if (
        (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
        (trimmed.startsWith('"') && trimmed.endsWith('"'))
    ) {
        return trimmed.slice(1, -1);
    }
    return trimmed;
}

function splitYamlishKeyValue(text) {
    const index = text.indexOf(':');
    if (index === -1) {
        return null;
    }

    return {
        key: text.slice(0, index).trim(),
        value: text.slice(index + 1),
    };
}

function parseYamlishBlock(text) {
    const normalized = stripCommonIndent(text);
    const lines = normalized.split('\n');
    let index = 0;

    function skipBlanks() {
        while (index < lines.length && lines[index].trim() === '') {
            index += 1;
        }
    }

    function parseNode(indent) {
        skipBlanks();
        if (index >= lines.length) {
            return null;
        }

        const line = lines[index];
        const lineIndent = countIndent(line);
        if (lineIndent < indent) {
            return null;
        }

        if (lineIndent === indent && line.trimStart().startsWith('- ')) {
            return parseArray(indent);
        }

        return parseObject(indent);
    }

    function parseObjectProperties(target, indent) {
        while (index < lines.length) {
            skipBlanks();
            if (index >= lines.length) {
                break;
            }

            const line = lines[index];
            const lineIndent = countIndent(line);
            if (lineIndent < indent) {
                break;
            }
            if (lineIndent !== indent || line.trimStart().startsWith('- ')) {
                break;
            }

            const kv = splitYamlishKeyValue(line.slice(indent));
            if (!kv) {
                break;
            }

            index += 1;
            if (kv.value.trim() === '') {
                skipBlanks();
                const nextIndent = index < lines.length ? countIndent(lines[index]) : indent + 2;
                target[kv.key] = parseNode(nextIndent);
            } else {
                target[kv.key] = parseYamlishScalar(kv.value);
            }
        }
    }

    function parseObject(indent) {
        const object = {};
        parseObjectProperties(object, indent);
        return object;
    }

    function parseArray(indent) {
        const array = [];

        while (index < lines.length) {
            skipBlanks();
            if (index >= lines.length) {
                break;
            }

            const line = lines[index];
            const lineIndent = countIndent(line);
            if (lineIndent < indent) {
                break;
            }
            if (lineIndent !== indent || !line.trimStart().startsWith('- ')) {
                break;
            }

            const rest = line.slice(indent + 2);
            index += 1;

            if (rest.trim() === '') {
                skipBlanks();
                const nextIndent = index < lines.length ? countIndent(lines[index]) : indent + 2;
                array.push(parseNode(nextIndent));
                continue;
            }

            const kv = splitYamlishKeyValue(rest);
            if (!kv) {
                array.push(parseYamlishScalar(rest));
                continue;
            }

            const item = {};
            if (kv.value.trim() === '') {
                skipBlanks();
                const nextIndent = index < lines.length ? countIndent(lines[index]) : indent + 2;
                item[kv.key] = parseNode(nextIndent);
            } else {
                item[kv.key] = parseYamlishScalar(kv.value);
            }

            parseObjectProperties(item, indent + 2);
            array.push(item);
        }

        return array;
    }

    return parseNode(0);
}

function parseMethodExamplePairs(methodBlock) {
    return extractMethodExampleBlocks(methodBlock)
        .map((example) => {
            const paramsLines = [];
            const resultLines = [];
            let mode = null;

            for (const line of example.lines.slice(1)) {
                if (line === '      params:') {
                    mode = 'params';
                    continue;
                }
                if (line === '      result:') {
                    mode = 'result';
                    continue;
                }

                if (mode === 'params') {
                    resultLines.length === 0 ? paramsLines.push(line) : null;
                    if (resultLines.length > 0) {
                        resultLines.push(line);
                    }
                    continue;
                }

                if (mode === 'result') {
                    resultLines.push(line);
                }
            }

            return {
                name: example.name,
                request: normalizeIndentedBlock(paramsLines),
                response: normalizeIndentedBlock(resultLines),
            };
        })
        .filter((example) => example.request || example.response);
}

function normalizeMethodExamplePair(example) {
    const requestBlock = parseYamlishBlock(example.request);
    const responseBlock = parseYamlishBlock(example.response);

    const request = {
        params: Array.isArray(requestBlock)
            ? requestBlock.map((item) => (item && typeof item === 'object' && 'value' in item ? item.value : item))
            : requestBlock,
    };

    let response = responseBlock;
    if (responseBlock && typeof responseBlock === 'object' && !Array.isArray(responseBlock) && 'value' in responseBlock) {
        response = responseBlock.value;
    }

    return {
        name: example.name,
        request: JSON.stringify(request),
        response: JSON.stringify(response),
    };
}

function parseDocExamplePairs(text) {
    const examplesIndex = text.indexOf('## Examples');
    if (examplesIndex === -1) {
        return [];
    }

    const examplesText = text.slice(examplesIndex);
    const pairs = [];
    const pattern = /<summary>\s*([^<]+?)\s*<\/summary>[\s\S]*?#### Request\s*```json\s*([\s\S]*?)```[\s\S]*?#### Response\s*```json\s*([\s\S]*?)```/g;
    let match = pattern.exec(examplesText);

    while (match) {
        try {
            pairs.push({
                name: match[1].trim(),
                request: JSON.stringify(JSON.parse(match[2])),
                response: JSON.stringify(JSON.parse(match[3])),
            });
        } catch (error) {
            pairs.push({
                name: match[1].trim(),
                __parseError: error.message,
            });
        }
        match = pattern.exec(examplesText);
    }

    return pairs;
}

function getPathValue(value, segments) {
    let current = value;
    for (const segment of segments) {
        if (current === undefined || current === null) {
            return { found: false };
        }

        if (typeof segment === 'number') {
            if (!Array.isArray(current) || segment >= current.length) {
                return { found: false };
            }
            current = current[segment];
            continue;
        }

        if (typeof current !== 'object' || !(segment in current)) {
            return { found: false };
        }

        current = current[segment];
    }

    return {
        found: true,
        value: current,
    };
}

function valueType(value) {
    if (value === null) {
        return 'null';
    }
    if (Array.isArray(value)) {
        return 'array';
    }
    return typeof value;
}

function findDocLabelLine(text, label) {
    const lines = text.split('\n');
    const normalized = `**${label}**`;
    const line = lines.find((candidate) => candidate.includes(normalized));
    return line ? line.trim() : null;
}

function runSchemaFieldNullableCheck(check) {
    const text = readUtf8(check.file);
    const schemaBlock = extractTopLevelSchemaBlock(text, check.schemaName);
    if (!schemaBlock) {
        return { ok: false, message: `Schema ${check.schemaName} was not found.` };
    }

    const propertyBlock = extractYamlPropertyBlock(schemaBlock, check.property);
    if (!propertyBlock) {
        return { ok: false, message: `Property ${check.schemaName}.${check.property} was not found.` };
    }

    if (blockAllowsExplicitNull(propertyBlock)) {
        return { ok: true };
    }

    const required = schemaPropertyIsRequired(schemaBlock, check.property);
    return {
        ok: false,
        message: `Expected explicit null support for ${check.schemaName}.${check.property}, but found ${nullabilityDescription(propertyBlock, required)}.`,
        file: check.file,
    };
}

function runSchemaFieldRequiredCheck(check) {
    const text = readUtf8(check.file);
    const schemaBlock = extractTopLevelSchemaBlock(text, check.schemaName);
    if (!schemaBlock) {
        return { ok: false, message: `Schema ${check.schemaName} was not found.` };
    }

    if (schemaPropertyIsRequired(schemaBlock, check.property)) {
        return { ok: true };
    }

    return {
        ok: false,
        message: `Expected ${check.schemaName}.${check.property} to be listed in the required fields.`,
        file: check.file,
    };
}

function runMethodParamNullableCheck(check) {
    const text = readUtf8(check.file);
    const methodBlock = extractMethodBlock(text, check.methodName);
    if (!methodBlock) {
        return { ok: false, message: `Method ${check.methodName} was not found.` };
    }

    const paramBlock = extractMethodParamBlock(methodBlock, check.paramName);
    if (!paramBlock) {
        return { ok: false, message: `Parameter ${check.paramName} of ${check.methodName} was not found.` };
    }

    if (blockAllowsExplicitNull(paramBlock)) {
        return { ok: true };
    }

    const required = /required:\s*true/.test(paramBlock);
    return {
        ok: false,
        message: `Expected explicit null support for parameter "${check.paramName}" of ${check.methodName}, but found ${required ? 'required and non-null' : 'optional but non-null'}.`,
        file: check.file,
    };
}

function runMethodParamRequiredCheck(check) {
    const text = readUtf8(check.file);
    const methodBlock = extractMethodBlock(text, check.methodName);
    if (!methodBlock) {
        return { ok: false, message: `Method ${check.methodName} was not found.` };
    }

    const paramBlock = extractMethodParamBlock(methodBlock, check.paramName);
    if (!paramBlock) {
        return { ok: false, message: `Parameter ${check.paramName} of ${check.methodName} was not found.` };
    }

    if (/required:\s*true/.test(paramBlock)) {
        return { ok: true };
    }

    return {
        ok: false,
        message: `Expected parameter "${check.paramName}" of ${check.methodName} to be present positionally rather than optional.`,
        file: check.file,
    };
}

function runDocJsonTypeCheck(check) {
    const text = readUtf8(check.file);
    const blocks = parseJsonCodeBlocks(text);
    const matches = [];

    for (let index = 0; index < blocks.length; index += 1) {
        const block = blocks[index];
        if (block.__parseError) {
            continue;
        }

        const result = getPathValue(block, check.path);
        if (result.found) {
            matches.push({
                blockIndex: index,
                value: result.value,
            });
        }
    }

    if (matches.length === 0) {
        return {
            ok: false,
            message: `No JSON example in ${check.file} exposed path ${check.path.join('.')}.`,
        };
    }

    const invalid = matches.find((match) => valueType(match.value) !== check.expectedType);
    if (!invalid) {
        return { ok: true };
    }

    return {
        ok: false,
        message: `Expected ${check.path.join('.')} in ${check.file} to be ${check.expectedType}, but found ${valueType(invalid.value)} in JSON block ${invalid.blockIndex + 1}.`,
        file: check.file,
    };
}

function runDocInteractiveRequestJsonTypeCheck(check) {
    const text = readUtf8(check.file);
    const blocks = parseInteractiveRequestBlocks(text);
    const matches = [];

    for (let index = 0; index < blocks.length; index += 1) {
        const block = blocks[index];
        if (block.__parseError) {
            continue;
        }

        const result = getPathValue(block, check.path);
        if (result.found) {
            matches.push({
                blockIndex: index,
                value: result.value,
            });
        }
    }

    if (matches.length === 0) {
        return {
            ok: false,
            message: `No InteractiveRequest JSON in ${check.file} exposed path ${check.path.join('.')}.`,
        };
    }

    const invalid = matches.find((match) => valueType(match.value) !== check.expectedType);
    if (!invalid) {
        return { ok: true };
    }

    return {
        ok: false,
        message: `Expected InteractiveRequest path ${check.path.join('.')} in ${check.file} to be ${check.expectedType}, but found ${valueType(invalid.value)} in block ${invalid.blockIndex + 1}.`,
        file: check.file,
    };
}

function runDocLabelNotPlainTypeCheck(check) {
    const text = readUtf8(check.file);
    const line = findDocLabelLine(text, check.label);
    if (!line) {
        return {
            ok: false,
            message: `Could not find documentation label ${check.label} in ${check.file}.`,
        };
    }

    if (line !== check.plainLine) {
        return { ok: true };
    }

    return {
        ok: false,
        message: `Expected documentation label "${check.label}" in ${check.file} to encode more than the plain type line "${check.plainLine}".`,
        file: check.file,
    };
}

function runDocLabelRequiredCheck(check) {
    const text = readUtf8(check.file);
    const line = findDocLabelLine(text, check.label);
    if (!line) {
        return {
            ok: false,
            message: `Could not find documentation label ${check.label} in ${check.file}.`,
        };
    }

    if (line.includes('*required*')) {
        return { ok: true };
    }

    return {
        ok: false,
        message: `Expected documentation label "${check.label}" in ${check.file} to be marked as required.`,
        file: check.file,
    };
}

function runMethodBlockContainsCheck(check) {
    const text = readUtf8(check.file);
    const methodBlock = extractMethodBlock(text, check.methodName);
    if (!methodBlock) {
        return { ok: false, message: `Method ${check.methodName} was not found.` };
    }

    if (methodBlock.includes(check.pattern)) {
        return { ok: true };
    }

    return {
        ok: false,
        message: `Expected method block ${check.methodName} in ${check.file} to contain "${check.pattern}".`,
        file: check.file,
    };
}

function runFileContainsCheck(check) {
    const text = readUtf8(check.file);
    if (text.includes(check.pattern)) {
        return { ok: true };
    }

    return {
        ok: false,
        message: `Expected ${check.file} to contain "${check.pattern}".`,
        file: check.file,
    };
}

function findExampleConflicts(examples) {
    const byRequest = new Map();

    for (const example of examples) {
        if (example.__parseError || !example.request) {
            continue;
        }

        const key = example.request;
        if (!byRequest.has(key)) {
            byRequest.set(key, []);
        }
        byRequest.get(key).push(example);
    }

    const conflicts = [];

    for (const group of byRequest.values()) {
        const responses = new Set(group.map((example) => example.response));
        if (group.length > 1 && responses.size > 1) {
            conflicts.push(group);
        }
    }

    return conflicts;
}

function formatConflictNames(conflict) {
    return conflict.map((example) => example.name).join(' <> ');
}

function runMethodExamplesConsistentCheck(check) {
    const text = readUtf8(check.file);
    const methodBlock = extractMethodBlock(text, check.methodName);
    if (!methodBlock) {
        return { ok: false, message: `Method ${check.methodName} was not found.` };
    }

    const conflicts = findExampleConflicts(parseMethodExamplePairs(methodBlock));
    if (conflicts.length === 0) {
        return { ok: true };
    }

    return {
        ok: false,
        message: `Found duplicate request examples with divergent results for ${check.methodName}: ${conflicts.map(formatConflictNames).join('; ')}.`,
        file: check.file,
    };
}

function runDocExamplesConsistentCheck(check) {
    const text = readUtf8(check.file);
    const examples = parseDocExamplePairs(text);
    const parseError = examples.find((example) => example.__parseError);
    if (parseError) {
        return {
            ok: false,
            message: `Failed to parse documentation example "${parseError.name}" in ${check.file}: ${parseError.__parseError}.`,
            file: check.file,
        };
    }

    const conflicts = findExampleConflicts(examples);
    if (conflicts.length === 0) {
        return { ok: true };
    }

    return {
        ok: false,
        message: `Found duplicate documentation request examples with divergent responses in ${check.file}: ${conflicts.map(formatConflictNames).join('; ')}.`,
        file: check.file,
    };
}

function runMethodDocExamplesMatchCheck(check) {
    const methodText = readUtf8(check.methodFile);
    const methodBlock = extractMethodBlock(methodText, check.methodName);
    if (!methodBlock) {
        return { ok: false, message: `Method ${check.methodName} was not found.` };
    }

    const methodExamples = parseMethodExamplePairs(methodBlock).map(normalizeMethodExamplePair);
    const docExamples = parseDocExamplePairs(readUtf8(check.docFile));

    if (methodExamples.length !== docExamples.length) {
        return {
            ok: false,
            message: `Expected ${check.methodName} to project ${methodExamples.length} example(s) into ${check.docFile}, but found ${docExamples.length}.`,
            file: check.docFile,
        };
    }

    for (let index = 0; index < methodExamples.length; index += 1) {
        const methodExample = methodExamples[index];
        const docExample = docExamples[index];

        if (methodExample.name !== docExample.name) {
            return {
                ok: false,
                message: `Expected example ${index + 1} for ${check.methodName} to be named "${methodExample.name}" in ${check.docFile}, but found "${docExample.name}".`,
                file: check.docFile,
            };
        }

        if (methodExample.request !== docExample.request) {
            return {
                ok: false,
                message: `Expected documentation request example "${methodExample.name}" in ${check.docFile} to match the OpenRPC method example for ${check.methodName}.`,
                file: check.docFile,
            };
        }

        if (methodExample.response !== docExample.response) {
            return {
                ok: false,
                message: `Expected documentation response example "${methodExample.name}" in ${check.docFile} to match the OpenRPC method example for ${check.methodName}.`,
                file: check.docFile,
            };
        }
    }

    return { ok: true };
}

function runCheck(check) {
    switch (check.kind) {
        case 'schema-field-nullable':
            return runSchemaFieldNullableCheck(check);
        case 'schema-field-required':
            return runSchemaFieldRequiredCheck(check);
        case 'method-param-nullable':
            return runMethodParamNullableCheck(check);
        case 'method-param-required':
            return runMethodParamRequiredCheck(check);
        case 'doc-json-type':
            return runDocJsonTypeCheck(check);
        case 'doc-interactive-request-json-type':
            return runDocInteractiveRequestJsonTypeCheck(check);
        case 'doc-label-not-plain-type':
            return runDocLabelNotPlainTypeCheck(check);
        case 'doc-label-required':
            return runDocLabelRequiredCheck(check);
        case 'method-block-contains':
            return runMethodBlockContainsCheck(check);
        case 'file-contains':
            return runFileContainsCheck(check);
        case 'method-examples-consistent':
            return runMethodExamplesConsistentCheck(check);
        case 'doc-examples-consistent':
            return runDocExamplesConsistentCheck(check);
        case 'method-doc-examples-match':
            return runMethodDocExamplesMatchCheck(check);
        default:
            return {
                ok: false,
                message: `Unsupported check kind: ${check.kind}`,
            };
    }
}

function parseForkFilter(argv) {
    const index = argv.indexOf('--fork');
    if (index === -1) {
        return null;
    }
    return argv[index + 1] ?? null;
}

function main() {
    const forkFilter = parseForkFilter(process.argv.slice(2));
    const groups = forkFilter
        ? issueGroups.filter((group) => group.fork === forkFilter)
        : issueGroups;

    if (groups.length === 0) {
        console.error(`No engine static checks are configured for fork "${forkFilter}".`);
        process.exitCode = 1;
        return;
    }

    const failures = [];

    for (const group of groups) {
        const groupFailures = [];

        for (const check of group.checks) {
            const result = runCheck(check);
            if (result.ok) {
                continue;
            }

            groupFailures.push({
                ruleId: check.ruleId,
                ...result,
            });
        }

        if (groupFailures.length > 0) {
            failures.push({
                group,
                findings: groupFailures,
            });
        }
    }

    const totalChecks = groups.reduce((sum, group) => sum + group.checks.length, 0);

    if (failures.length === 0) {
        console.log(`Engine static check passed. ${totalChecks} check(s) ran with no findings${forkFilter ? ` for fork "${forkFilter}"` : ''}.`);
        return;
    }

    const totalFindings = failures.reduce((sum, entry) => sum + entry.findings.length, 0);
    console.error(`Engine static check failed with ${totalFindings} finding(s) across ${failures.length} issue group(s)${forkFilter ? ` for fork "${forkFilter}"` : ''}.`);

    for (const entry of failures) {
        console.error(`\n[${entry.group.id}] ${entry.group.title}`);
        for (const finding of entry.findings) {
            console.error(`- [${finding.ruleId}] ${finding.message}`);
            if (finding.file) {
                console.error(`  file: ${finding.file}`);
            }
        }
    }

    process.exitCode = 1;
}

main();
