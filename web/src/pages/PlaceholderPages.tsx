import { Agent } from '../components/agents/Agent.tsx';
import { ComingSoon } from '../components/ui/ComingSoon.tsx';
import { PageHeader } from '../components/ui/PageHeader.tsx';

export function DigestPage() {
  return (
    <>
      <PageHeader code="03 DIGEST" title="定时日报">
        按你设定的时间和范围，自动汇总成一份中文日报。
      </PageHeader>
      <ComingSoon
        milestone="M5"
        title="情报员 回声 待命中"
        agent={<Agent id="echo" expression="default" />}
        items={['日报配置：范围、推送时间、条数上限', '历史日报列表和详情', '通过站内和邮件发送']}
      />
    </>
  );
}

export function DiscoverPage() {
  return (
    <>
      <PageHeader code="04 DISCOVER" title="兴趣发现">
        不用填关键词，只选方向，系统帮你找出这个方向上刚冒头的新热点。
      </PageHeader>
      <ComingSoon
        milestone="M6"
        title="先锋 烈锋 待命中"
        agent={<Agent id="blaze" expression="smug" />}
        items={['选择方向（AI 大模型、开源、芯片……）', '新热点卡片：增长曲线和"为什么算新"', '"不感兴趣"反馈']}
      />
    </>
  );
}

export function NotFoundPage() {
  return (
    <>
      <PageHeader code="404" title="页面不存在" />
      <div className="mx-auto w-40">
        <Agent id="lynx" expression="down" />
      </div>
    </>
  );
}
