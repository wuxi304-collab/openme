// Stable error codes used by the main process. The renderer maps each code
// to a localized message via i18n. The `defaultMessage` is a Chinese fallback
// used for logging and for the rare case where the renderer hasn't loaded the
// translation table yet (cold start race).

const IPC_ERROR_CODES = {
  // File operations
  FILE_NOT_FOUND: { defaultMessage: "文件不存在" },
  FILE_TOO_LARGE: { defaultMessage: "文件过大" },
  TEXT_FILE_TOO_LARGE: { defaultMessage: "文件太大" },
  READ_FILE_FAILED: { defaultMessage: "无法读取文件" },
  READ_TEXT_FAILED: { defaultMessage: "无法读取" },
  READ_FILE_CONTENT_FAILED: { defaultMessage: "无法读取" },
  READ_BINARY_FAILED: { defaultMessage: "无法读取" },
  SAVE_FILE_FAILED: { defaultMessage: "无法保存" },
  SAVE_RECENT_FAILED: { defaultMessage: "无法保存" },
  CONVERT_DOCX_FAILED: { defaultMessage: "Word 转换失败" },
  CONVERT_EXCEL_FAILED: { defaultMessage: "Excel 转换失败" },
  EXCEL_TOO_LARGE: { defaultMessage: "Excel 文件超过 50 MB 预览限制" },
  OPEN_IN_SYSTEM_FAILED: { defaultMessage: "无法打开" },
    REVEAL_IN_FOLDER_FAILED: { defaultMessage: "无法在文件管理器中显示" },
    FILE_HASH_FAILED: { defaultMessage: "无法计算文件指纹" },
    MEDIA_NOT_FOUND: { defaultMessage: "媒体文件不存在" },
  // ZIP
  ZIP_TOO_MANY_FILES: { defaultMessage: "压缩包文件过多（超过 100,000 项）" },
  ZIP_TOO_LARGE: { defaultMessage: "解压后体积超过 2 GB 安全限制" },
  ZIP_UNSAFE_PATH: { defaultMessage: "压缩包包含不安全路径" },
  ZIP_PATH_TRAVERSAL: { defaultMessage: "路径越界" },
  ZIP_ENTRY_NOT_FOUND: { defaultMessage: "压缩包内未找到该文件" },
  ZIP_ENTRY_TOO_LARGE: { defaultMessage: "文件超过 2 MB 预览限制" },
  // EPUB
  EPUB_TOO_LARGE: { defaultMessage: "EPUB 超过 100 MB 预览限制" },
  EPUB_MISSING_CONTAINER: { defaultMessage: "EPUB 缺少内容目录" },
  EPUB_INVALID_CONTAINER: { defaultMessage: "EPUB 内容目录无效" },
  EPUB_NO_CHAPTERS: { defaultMessage: "没有找到可阅读的文本章节" },
  // CAD
  CADHOST_NOT_BUILT: { defaultMessage: "ACadSharp CadHost 尚未构建" },
  CADHOST_INVALID_DATA: { defaultMessage: "CadHost 返回无效数据" },
  CADHOST_RENDER_FAILED: { defaultMessage: "CadHost 渲染失败" },
  // AI
  AI_NO_ENCRYPTION: { defaultMessage: "系统加密存储不可用" },
  AI_INVALID_URL: { defaultMessage: "接口地址必须使用 HTTPS（本地服务除外）" },
  AI_MISSING_KEY: { defaultMessage: "请输入 API Key" },
  AI_NOT_CONFIGURED: { defaultMessage: "请先配置 API Key" },
  AI_EMPTY_REQUEST: { defaultMessage: "修改要求不能为空" },
  AI_REQUEST_FAILED: { defaultMessage: "模型请求失败" },
  AI_NO_PLAN: { defaultMessage: "模型没有返回结构化计划" },
  // Settings sync
  SETTINGS_EXPORT_FAILED: { defaultMessage: "无法导出设置" },
  SETTINGS_IMPORT_FAILED: { defaultMessage: "无法导入设置" },
  SETTINGS_IMPORT_INVALID_JSON: { defaultMessage: "设置文件不是合法 JSON" },
};

function ipcError(code, params, message) {
  const entry = IPC_ERROR_CODES[code];
  const fallback = entry ? entry.defaultMessage : code;
  return { success: false, code, params: params || {}, message: message || fallback };
}

function ipcErrorWithDetail(code, message) {
  return ipcError(code, {}, message);
}

module.exports = { IPC_ERROR_CODES, ipcError, ipcErrorWithDetail };
