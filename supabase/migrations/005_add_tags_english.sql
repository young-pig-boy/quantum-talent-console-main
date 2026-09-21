-- ============================================================
-- Migration 005: 公开岗位 tags 英文化 (v2 修复版)
-- 1) 新增 tags_en 列（TEXT，存储 JSON 字符串数组）
-- 2) 按映射表把全部存量岗位的中文标签回填为英文；
--    映射表未命中的标签（本就是英文/符号）原样保留。
-- 注意：tags 列的真实类型是 text[]（Postgres 原生数组，非 JSON 文本），
--       必须先 to_jsonb() 转换再逐元素映射。
-- 幂等：可重复执行。
-- ============================================================

ALTER TABLE job_publications ADD COLUMN IF NOT EXISTS tags_en TEXT;

DO $migration$
DECLARE
  r   RECORD;
  res jsonb;
  mp  jsonb := '{"AI 基础设施":"AI Infrastructure","AI算法":"AI Algorithms","IT支持":"IT Support","Linux 驱动":"Linux Drivers","上海":"Shanghai","专利":"Patents","中性原子":"Neutral Atoms","云原生":"Cloud Native","产业政策":"Industrial Policy","产业生态":"Industry Ecosystem","企业服务":"Enterprise Services","优化Pass":"Optimization Passes","低噪声":"Low Noise","低温":"Cryogenics","偏振":"Polarization","傅里叶光学":"Fourier Optics","催化":"Catalysis","先进封装":"Advanced Packaging","光学":"Optics","光学工程":"Optical Engineering","光学平台":"Optical Platforms","光学设计":"Optical Design","光机结构":"Opto-mechanical Structure","光波导":"Optical Waveguides","光源":"Light Sources","光电共封":"Co-packaged Optics","光纤激光器":"Fiber Lasers","光芯片":"Photonic Chips","光路设计":"Optical Path Design","光量子":"Photonic Quantum","光镊":"Optical Tweezers","光镊阵列":"Optical Tweezer Arrays","全栈":"Full Stack","公共关系":"Public Relations","公司治理":"Corporate Governance","内容运营":"Content Operations","冷原子":"Cold Atoms","分布式系统":"Distributed Systems","初级量子工程师":"Junior Quantum Engineer","刻蚀":"Etching","北京":"Beijing","博士":"PhD","合规":"Compliance","品牌":"Branding","噪声模型":"Noise Models","团队管理":"Team Management","图像处理":"Image Processing","图论算法":"Graph Algorithms","大模型":"Large Language Models","媒体":"Media","实习":"Internship","实时测控":"Real-time Control","实验自动化":"Lab Automation","容错量子计算":"Fault-tolerant Quantum Computing","射频":"RF","射频仪器":"RF Instruments","嵌入式":"Embedded Systems","嵌入式Linux":"Embedded Linux","嵌入式硬件":"Embedded Hardware","工艺工程":"Process Engineering","工艺整合":"Process Integration","干涉测量":"Interferometry","平台开发":"Platform Development","应用算法":"Applied Algorithms","开放量子系统":"Open Quantum Systems","异构计算":"Heterogeneous Computing","待核验":"To Be Verified","微波":"Microwave","微纳光学":"Micro-nano Optics","战略规划":"Strategic Planning","技术行政":"Technical Administration","投资者关系":"Investor Relations","招投标":"Bidding & Tendering","政府":"Government","政府关系":"Government Relations","政府科研项目":"Government Research Programs","政府项目":"Government Projects","数值仿真":"Numerical Simulation","数值模拟":"Numerical Modeling","数字信号处理":"Digital Signal Processing","数字电路":"Digital Circuits","数学优化":"Mathematical Optimization","数据采集":"Data Acquisition","机械结构":"Mechanical Structure","机械设计":"Mechanical Design","材料":"Materials","模拟电路":"Analog Circuits","测控":"Control & Measurement","激光":"Lasers","激光控制":"Laser Control","热管理":"Thermal Management","生物医药":"Biopharmaceuticals","电子工程":"Electronics Engineering","电池材料":"Battery Materials","电磁仿真":"Electromagnetic Simulation","知识产权":"Intellectual Property","研发支持":"R&D Support","研发管理":"R&D Management","研发项目管理":"R&D Project Management","硬科技":"Deep Tech","硬科技传播":"Deep Tech Communications","科学计算":"Scientific Computing","科技政策":"Tech Policy","科技项目申报":"Tech Program Applications","科研负责人":"Research Lead","稳定子码":"Stabilizer Codes","窄线宽":"Narrow-linewidth","算力中心":"Computing Centers","算法":"Algorithms","算法总监":"Algorithm Director","精密仪器":"Precision Instruments","精密光学":"Precision Optics","精密工装":"Precision Tooling","约瑟夫森结":"Josephson Junctions","经营管理":"Operations Management","结构工程":"Structural Engineering","编译优化":"Compiler Optimization","脉冲优化":"Pulse Optimization","自动校准":"Automated Calibration","良率":"Yield","芯片设计":"Chip Design","药物研发":"Drug Discovery","董事会秘书":"Board Secretary","蛋白":"Proteins","融资":"Financing","融资传播":"Fundraising Communications","解决方案":"Solutions","解码器":"Decoders","计算化学":"Computational Chemistry","计算材料":"Computational Materials","计算生物":"Computational Biology","设备驱动":"Device Drivers","调度":"Scheduling","资本市场":"Capital Markets","资源估算":"Resource Estimation","超冷原子":"Ultracold Atoms","超导芯片":"Superconducting Chips","超导量子":"Superconducting Quantum","超导量子芯片":"Superconducting Quantum Chips","跨团队协同":"Cross-team Collaboration","软硬件协同":"Hardware-Software Co-design","运维":"Operations","运行时":"Runtime","酶催化":"Enzyme Catalysis","里德伯原子":"Rydberg Atoms","量子AI":"Quantum AI","量子云":"Quantum Cloud","量子产业":"Quantum Industry","量子仿真":"Quantum Simulation","量子光学":"Quantum Optics","量子化学":"Quantum Chemistry","量子噪声":"Quantum Noise","量子实验":"Quantum Experiments","量子工程":"Quantum Engineering","量子平台":"Quantum Platforms","量子应用":"Quantum Applications","量子控制":"Quantum Control","量子操作系统":"Quantum Operating Systems","量子操控":"Quantum Manipulation","量子机器学习":"Quantum Machine Learning","量子架构":"Quantum Architecture","量子校准":"Quantum Calibration","量子模拟":"Quantum Simulation","量子测控":"Quantum Measurement & Control","量子研发":"Quantum R&D","量子硬件":"Quantum Hardware","量子科学家":"Quantum Scientist","量子科技":"Quantum Technology","量子算法":"Quantum Algorithms","量子纠错":"Quantum Error Correction","量子编译":"Quantum Compilers","量子计算":"Quantum Computing","量子读出":"Quantum Readout","量子软件":"Quantum Software","量子门":"Quantum Gates","闭环优化":"Closed-loop Optimization","项目协调":"Project Coordination","项目申报":"Grant Applications","项目管理":"Project Management","风险管理":"Risk Management","飞秒激光":"Femtosecond Lasers","高斯光束":"Gaussian Beams","高速成像":"High-speed Imaging"}'::jsonb;
BEGIN
  FOR r IN SELECT id, tags FROM job_publications WHERE tags IS NOT NULL LOOP
    BEGIN
      -- to_jsonb(text[]) → JSON 数组；若 tags 将来改成 jsonb/text 存 JSON 也兼容
      SELECT jsonb_agg(COALESCE(mp ->> t, t) ORDER BY ord)
        INTO res
        FROM jsonb_array_elements_text(to_jsonb(r.tags)) WITH ORDINALITY AS e(t, ord);
      UPDATE job_publications SET tags_en = res::text WHERE id = r.id;
    EXCEPTION WHEN OTHERS THEN
      -- 单行转换失败（非数组等异常数据）跳过该行，不让整体失败
      NULL;
    END;
  END LOOP;
  RAISE NOTICE 'migration 005 done: tags_en backfilled';
END
$migration$;
