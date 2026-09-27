"""算法层异常定义。

所有「算法拒绝计算」的情况都抛出 AlgorithmError 的子类，
由 API 层统一转换为带中文原因的 400 响应。
"""


class AlgorithmError(Exception):
    """算法无法在给定输入上正确执行的基类。"""


class NegativeWeightError(AlgorithmError):
    """Dijkstra 遇到了负权边 —— 结果不可信，必须拒绝而不是悄悄算错。"""
