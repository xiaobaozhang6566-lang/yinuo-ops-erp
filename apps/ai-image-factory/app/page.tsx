export default function Home() {
  return (
    <main style={{ maxWidth: 920, margin: "48px auto", padding: 24 }}>
      <header style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: "#142b49", color: "white", display: "grid", placeItems: "center", fontWeight: 700 }}>Y</div>
        <div>
          <h1 style={{ margin: 0, fontSize: 24 }}>亦诺跨境 AI 图片工厂</h1>
          <p style={{ margin: "6px 0 0", color: "#667085" }}>V1.0 · ChatGPT MCP 应用服务</p>
        </div>
      </header>
      <section style={{ marginTop: 32, padding: 24, background: "white", border: "1px solid #e4e7ec", borderRadius: 16 }}>
        <h2 style={{ marginTop: 0 }}>服务状态</h2>
        <p>应用骨架已建立。图片生成工具仅在模型权限、独立数据存储、API 密钥和预算控制验收完成后开放。</p>
        <ul style={{ lineHeight: 1.9, color: "#475467" }}>
          <li>ChatGPT 作为员工统一操作入口</li>
          <li>图片模型通过服务端 OpenAI API 调用</li>
          <li>原图与成品使用私有存储</li>
          <li>每次调用记录任务、模型和费用</li>
        </ul>
      </section>
    </main>
  );
}
