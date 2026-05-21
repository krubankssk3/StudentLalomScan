/**
 * ============================================================
 *  config.js - ไฟล์ตั้งค่าระบบจดหมายข่าว (Frontend)
 *  ผู้พัฒนา: นายชิติพัทธ์ นิลวรรณ
 * ============================================================
 *
 *  ⚠️ สำคัญ: แก้ค่า API_URL ด้านล่างให้เป็น Web App URL ของคุณ
 *  (URL ที่ลงท้ายด้วย /exec ที่ได้จากตอน Deploy ใน Apps Script)
 * ============================================================
 */

const CONFIG = {
  // 🔴 แก้ตรงนี้! ใส่ Web App URL ของคุณ (ลงท้าย /exec)
  API_URL: 'https://script.google.com/macros/s/AKfycbwCZdmbvRa8ppW2p_CVCQ8CPg-J4ArhH616Q0329vrvq5NjDy0zVgMrJGgjS-qASGTm7A/exec',

  // ข้อมูลโรงเรียน (แสดงบนหน้าเว็บ)
  SCHOOL_NAME: 'โรงเรียนบ้านละลม',
  SCHOOL_DISTRICT: 'สพป.ศรีสะเกษ เขต 3',

  // โลโก้โรงเรียน
  LOGO_URL: 'https://img2.pic.in.th/pic/Logo-7aecb8e321ff2955.png',

  // ข้อมูลผู้พัฒนา (แสดงใน Footer)
  DEVELOPER: 'นายชิติพัทธ์ นิลวรรณ',
  DEVELOPER_ROLE: 'ครู โรงเรียนบ้านละลม',
  DEVELOPER_DISTRICT: 'สำนักงานเขตพื้นที่การศึกษาประถมศึกษาศรีสะเกษ เขต 3',

  // ลิงก์หน้า Admin (แก้เป็น path จริงตอน deploy)
  ADMIN_URL: './admin/',

  // ตั้งค่าการแสดงผล
  ITEMS_PER_PAGE: 12,        // จำนวนการ์ดต่อหน้า
  HOT_THRESHOLD: 200,        // ยอดดูเกินนี้ขึ้น badge "ฮอต"
  POPULAR_THRESHOLD: 400,    // ยอดดูเกินนี้ขึ้น badge "ยอดนิยม"

  VERSION: 'v1.0.0'
};
