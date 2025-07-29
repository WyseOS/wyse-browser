import {isEmpty} from 'lodash';


export const fetchProvider = (params:any, options?:any) => fetch(`${isEmpty(params) ? '' : `${params}`}`, options).then(resp => resp.json())