export const ok = (res, data = null, message = "Success", status = 200) =>
  res.status(status).json({ success: true, message, data });

export const fail = (res, message, status = 400, data = null) =>
  res.status(status).json({ success: false, message, data });
