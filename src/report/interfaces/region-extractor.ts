/**
 * Region Extractor Interface
 * 
 * Extracts and standardizes region information from node data.
 */

import { Node, NodeMetadata } from './region-analyzer.js';

export interface RegionExtractor {
  /**
   * Extract region from node using multiple strategies
   */
  extractRegion(node: Node): string;

  /**
   * Extract region from node metadata
   */
  extractFromMetadata(metadata: NodeMetadata): string | null;

  /**
   * Extract region from node name using pattern matching
   */
  extractFromName(nodeName: string): string | null;

  /**
   * Map country code to standard region
   */
  mapCountryToRegion(country: string): string;
}

/**
 * Standard region categories (Chinese names)
 */
export type StandardRegion =
  | '香港'
  | '日本'
  | '新加坡'
  | '台湾'
  | '美东'
  | '美西'
  | '美国'
  | '欧洲'
  | '南美'
  | '东南亚'
  | '韩国'
  | '印度'
  | '澳大利亚'
  | '加拿大'
  | '中东'
  | '非洲'
  | '其他';
