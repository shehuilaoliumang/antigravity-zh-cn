import { translateText, looksLikePathOrId, applyRegexRules } from '../src/engine.mjs';
import dictionary from '../src/dictionary.json' with { type: 'json' };

const cases = [];
function test(name, fn) {
  try {
    fn();
    cases.push({ name, ok: true });
  } catch (err) {
    cases.push({ name, ok: false, error: err.message || String(err) });
  }
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}

test('dictionary is substantial', () => {
  assert(Object.keys(dictionary).length >= 1000, 'expected >= 1000 entries, got ' + Object.keys(dictionary).length);
});

test('terminology preferences', () => {
  const expect = {
    Orchestrator: '编排器',
    Executor: '执行器',
    Swarm: '协作集群',
    'Thinking effort': '思考深度',
    'Side question': '旁路提问',
    Branch: '分支',
    Sandbox: '沙箱',
    Permissions: '权限',
    'Allow again': '再次允许',
    'Send Now': '立即发送',
    Agent: '智能体',
    Agents: '智能体',
  };
  for (const [en, zh] of Object.entries(expect)) {
    assert(translateText(en) === zh, en + ' => ' + translateText(en) + ' (expected ' + zh + ')');
  }
});

test('brand names stay recognizable in composed strings', () => {
  assert(dictionary['Quit Antigravity'] === '退出 Antigravity');
  assert(dictionary['Welcome to Antigravity'] === '欢迎使用 Antigravity');
});

test('exact menu and dialog strings', () => {
  assert(translateText('Confirm Quit') === '确认退出');
  assert(translateText('Are you sure you want to quit?') === '确定要退出吗？');
  assert(translateText('Connect to WSL') === '连接到 WSL');
  assert(translateText('Reopen Locally') === '在本地重新打开');
  assert(translateText('Docs') === '文档');
  assert(translateText('No agents running') === '没有正在运行的智能体');
});

test('dynamic regex', () => {
  assert(applyRegexRules('Explored 3 files >').includes('已浏览 3 个文件'));
  assert(applyRegexRules('Resets in 2 hours 10 minutes').includes('小时'));
  assert(applyRegexRules('3 agents running').includes('3 个智能体'));
  assert(applyRegexRules('Worked for 2s').includes('运行耗时'));
});

test('paths, urls, hashes, branches are not translated', () => {
  assert(looksLikePathOrId('C:\\Users\\Public\\project'));
  assert(looksLikePathOrId('https://antigravity.google'));
  assert(looksLikePathOrId('feature/login-fix'));
  assert(looksLikePathOrId('a1b2c3d4e5f6a7'));
  assert(translateText('https://example.com/path') === 'https://example.com/path');
  assert(translateText('feature/login-fix') === 'feature/login-fix');
});

test('short core words require isolated flag', () => {
  assert(translateText('console') === 'console');
  assert(translateText('console', { isolated: true }) === '控制台');
});

test('long unmatched prose is left intact', () => {
  const prose = 'The quick brown fox jumps over the lazy dog while discussing implementation details of an experimental protocol that nobody would put on a button ' + 'word '.repeat(20);
  assert(translateText(prose) === prose);
});

export default cases;
