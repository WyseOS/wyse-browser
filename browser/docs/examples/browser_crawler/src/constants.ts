import path from "path";
import dayjs from "dayjs";

export const NOW = dayjs().format("DD-MM-YYYY_HH-mm-ss");

export const FOLDER_DESTINATION = "./output";
export const FUlL_PATH_FOLDER_DESTINATION = path.resolve(FOLDER_DESTINATION);

export const TIMEOUT_SECONDES = 30;