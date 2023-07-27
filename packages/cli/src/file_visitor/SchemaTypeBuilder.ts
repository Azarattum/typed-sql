import {
  parseDdlRelations,
  getDdlRelations,
  getQueryRelations,
  parseQueryRelations,
} from "@vlcn.io/type-gen-ts-adapter";
import { getChildren, trimTag } from "../util.js";
import { normalize } from "path";
import ts from "typescript";
import SchemaCache from "../SchemaCache.js";
import DependencyGraph from "../DependencyGraph.js";

export default class SchemaTypeBuilder {
  constructor(
    private schemaCache: SchemaCache,
    private dag: DependencyGraph,
    private sourceFile: ts.SourceFile
  ) {}

  /**
   * Given a declaration, returns the type if it already exists in the cache.
   * Builds it and caches it if it does not.
   *
   * Does no file operations.
   */
  getOrBuildRelationsFromDeclaration() {
    // here we can add a link in the dag if the declaration is not defined in this file.
    // if (decl not in this_file) {
    //   this.dag.addDependent(decl, this_file);
    // }
  }

  /**
   * Builds all of the types for the schemas that are resident to the current
   * file.
   *
   * This clears the schema type cache for that file and re-builds it for that file.
   *
   * Will reun the replace against the file.
   */
  buildResidentTypes(schemaDefinitions: ts.TaggedTemplateExpression[]): this {
    this.schemaCache.clearForFile(this.sourceFile.fileName);
    return this;
  }

  private processDeclareSchemaTemplate(
    node: ts.TaggedTemplateExpression,
    checker: ts.TypeChecker
  ): ReturnType<typeof getDdlRelations> {
    const children = getChildren(node);
    const templateStringNode = children[children.length - 1];
    const maybeExistingNode = children[1];
    const schemaAccessNode = children[0];
    const range: [number, number] = [
      schemaAccessNode.getEnd(),
      templateStringNode.getStart(),
    ];
    if (ts.isTemplateLiteral(templateStringNode)) {
      let existingContent = "";
      if (maybeExistingNode != templateStringNode) {
        existingContent = normalize(`<${maybeExistingNode.getText()}>`);
      }
      const schemaRelations = getDdlRelations(
        trimTag(templateStringNode.getText())
      );
      // this.schemaCache.put();
      const replacement = this.genRecordShapeCode(schemaRelations);
      if (existingContent == normalize(replacement)) {
        return schemaRelations;
      }
      const pos = this.sourceFile.getLineAndCharacterOfPosition(range[0]);
      // TODO: replace!
      // context.report({
      //   message: `content does not match: ${replacement}`,
      //   loc: { line: pos.line, column: pos.character },
      //   fix: (fixer) => fixer.replaceTextRange(range, replacement),
      // });

      return schemaRelations;
    }

    return [];
  }

  // TODO: take in original indentation offset
  private genRecordShapeCode(
    relations: ReturnType<typeof getDdlRelations>
  ): string {
    try {
      const recordTypes = parseDdlRelations(relations);
      return `<{
  ${Object.entries(recordTypes)
    .map(([key, value]) => {
      return `${key.replace("main.", "")}: {
    ${Object.entries(value)
      .map(([key, value]) => {
        return `${key}: ${value}`;
      })
      .join(",\n    ")}
  }`;
    })
    .join(",\n  ")}
}>`;
    } catch (e: any) {
      return `<{/*
  ${e.message}
*/}>` as string;
    }
  }

  private getSchemaRelationsForQueryDependency(
    schemaNode: ts.Node,
    checker: ts.TypeChecker
  ): ReturnType<typeof getDdlRelations> {
    const schemaNodeSymbol = checker.getSymbolAtLocation(schemaNode);
    const decl = schemaNodeSymbol?.valueDeclaration;
    // this is the correct source file containing schema!
    console.log(decl!.getSourceFile().fileName);
    console.log(decl?.getFullText());

    // if the file has already been visited then we'll already have the required relations.
    // what is the cache key for those relations though???
    // fileName + declaration site?

    // if the file has not been visited we must eagerly visit it from this visitor.

    return [];
  }
}