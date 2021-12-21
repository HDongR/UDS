import { version } from '../package.json';
export * from './core/Constants';
import {IS_NODE} from './core/util/env';
console.log(IS_NODE);