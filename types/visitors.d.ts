import { Node } from '@babel/types';
import { NodePath } from "@babel/traverse";
import { I18nOptions } from "./options";
import { I18nMap } from "./common";

export declare function shouldTransform(path: NodePath): boolean;
export declare function isTFunction(node: Node, option: I18nOptions): boolean;
export declare function createI18nVisitor(option: I18nOptions, i18nMap?: I18nMap): Record<string, (path: NodePath) => void>;
export declare function createI18nPlugin(option: I18nOptions, i18nMap?: I18nMap): () => { visitor: Record<string, (path: NodePath) => void> };
