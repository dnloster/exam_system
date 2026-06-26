import Swal from "sweetalert2";

const baseConfig = {
  confirmButtonColor: "#0f6cbf",
  cancelButtonColor: "#64748b",
  cancelButtonText: "Hủy",
};

export async function confirmAction(options: {
  title?: string;
  text: string;
  confirmText?: string;
  icon?: "warning" | "question";
}) {
  const result = await Swal.fire({
    ...baseConfig,
    title: options.title ?? "Xác nhận",
    text: options.text,
    icon: options.icon ?? "warning",
    showCancelButton: true,
    confirmButtonText: options.confirmText ?? "Đồng ý",
  });
  return result.isConfirmed;
}

export async function confirmDelete(text: string) {
  return confirmAction({
    text,
    confirmText: "Xóa",
    icon: "warning",
  });
}

export function showSuccess(text: string) {
  return Swal.fire({
    icon: "success",
    title: "Thành công",
    text,
    timer: 2000,
    showConfirmButton: false,
  });
}

export function showError(text: string) {
  return Swal.fire({
    icon: "error",
    title: "Lỗi",
    text,
    confirmButtonColor: baseConfig.confirmButtonColor,
  });
}
