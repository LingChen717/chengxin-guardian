# 接口说明

## 一、认证接口
### 1. 学生登录建档
- `POST /api/auth/student/login`

请求参数：
```json
{
  "studentId": "20240001",
  "name": "张三",
  "major": "软件工程1班"
}
```

### 2. 心理辅导工作台登录
- `POST /api/auth/admin/login`

### 3. 系统治理中心登录
- `POST /api/auth/superadmin/login`

## 二、学生端接口
### 1. 获取个人档案
- `GET /api/student/me`

### 2. 获取个人历史记录
- `GET /api/student/history`

返回内容包括：学生档案、对话记录、日记记录、预警记录、干预记录。

### 3. 发送心理对话
- `POST /api/chats/send`

请求参数：
```json
{
  "studentId": "20240001",
  "message": "最近总是睡不好，压力很大。"
}
```

### 4. 提交情绪日记
- `POST /api/diaries/analyze`

请求参数：
```json
{
  "studentId": "20240001",
  "content": "这周临近考试，我总觉得自己准备不够。"
}
```

## 三、心理辅导工作台接口
### 1. 查询预警列表
- `GET /api/admin/alerts?masked=true`

### 2. 更新预警状态
- `PATCH /api/admin/alerts/:id/status`

请求参数：
```json
{
  "status": "following"
}
```

状态取值：
- `pending`：待研判
- `following`：跟进中
- `resolved`：已处理
- `archived`：已归档

### 3. 获取工作台统计信息
- `GET /api/admin/stats`

### 4. 获取学生列表
- `GET /api/admin/students`

### 5. 获取学生详情
- `GET /api/admin/students/:studentId/detail`

### 6. 新增干预记录
- `POST /api/admin/students/:studentId/notes`

请求参数：
```json
{
  "content": "已电话联系学生，建议前往心理中心面谈。"
}
```

### 7. 删除学生档案
- `DELETE /api/admin/students/:studentId`

## 四、系统治理中心接口
### 1. 获取平台总览
- `GET /api/superadmin/overview`

### 2. 导出平台数据
- `GET /api/superadmin/export`

### 3. 导入平台数据
- `POST /api/superadmin/import`

### 4. 重置平台数据
- `DELETE /api/superadmin/reset`
