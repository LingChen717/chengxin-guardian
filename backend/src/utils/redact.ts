export function redactSensitiveText(text: string): string {
  return text
    .replace(/1\d{10}/g, '[手机号已脱敏]')
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[邮箱已脱敏]')
    .replace(/\d{6,18}[0-9Xx]?/g, '[证件或学号已脱敏]')
    .replace(/([一-龥]{2,4})(同学|老师|教授|辅导员)/g, '[姓名已脱敏]$2');
}

export function maskStudent(name: string, studentId: string) {
  return {
    studentName: name ? `${name[0]}**` : '***',
    studentId: studentId ? `${studentId.slice(0, 3)}***` : '***'
  };
}
