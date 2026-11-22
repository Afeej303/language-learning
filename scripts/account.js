import {account} from '../src/auth.js';
const [name,role='student']=process.argv.slice(2);
if(!process.env.ACCOUNT_PASSWORD)throw Error('Set ACCOUNT_PASSWORD first.');
account(name,process.env.ACCOUNT_PASSWORD,role);
console.log('Account created:',name,role);
