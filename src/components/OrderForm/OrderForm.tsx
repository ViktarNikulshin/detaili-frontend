import React, { useEffect, useState } from "react";
import { Controller, FieldValues, SubmitHandler, useForm } from "react-hook-form";
import * as Yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { useNavigate, useParams } from "react-router-dom";
import { orderAPI, OrderPayload } from "../../services/orderApi";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import "./OrderForm.css";
import { WorkType } from "../../types/order";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

type Notification = {
    message: string;
    type: "success" | "error";
    visible: boolean;
};

const PencilIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-pencil"
         viewBox="0 0 16 16">
        <path
            d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207zm1.586 3L10.5 3.207 4 9.707V12h2.293z"/>
    </svg>
);

const schema = Yup.object().shape({
    clientName: Yup.string().required("Введите имя клиента"),
    clientPhone: Yup.string().required("Введите телефон"),
    carBrand: Yup.string().required("Введите марку автомобиля"),
    works: Yup.array()
        .of(
            Yup.object().shape({
                id: Yup.number().optional(),
                workType: Yup.object().shape({
                    id: Yup.number().required(),
                    name: Yup.string().required(),
                    code: Yup.string().required(),
                    color: Yup.string().optional().nullable(),
                }).required(),
                cost: Yup.number()
                    .typeError("Введите стоимость услуги")
                    .min(0, "Стоимость не может быть отрицательной")
                    .optional()
                    .nullable(),
                comment: Yup.string().nullable().optional(),
            })
        )
        .min(1, "Выберите хотя бы один тип работ")
        .required(),
    arrivalDate: Yup.string().required("Укажите дату поступления авто"),
    deliveryDate: Yup.string().required("Укажите дату выдачи авто"),
    orderCost: Yup.number()
        .typeError("Введите стоимость заказа")
        .required("Введите стоимость заказа")
        .min(0, "Стоимость не может быть отрицательной"),
});

type OrderFormValues = Yup.InferType<typeof schema>;

interface OrderFormProps {
    /** "page" — обычная страница (/orders/new, /orders/:id), "modal" — всплывающее окно поверх календаря */
    mode?: "page" | "modal";
    /** ID заказа для редактирования в режиме модалки (в режиме страницы ID берётся из URL) */
    orderId?: string;
    /** Вызывается при закрытии модалки (кнопка закрытия, клик по фону или после успешного сохранения) */
    onClose?: () => void;
    /** Вызывается после успешного создания/обновления заказа (например, чтобы обновить события календаря) */
    onSuccess?: () => void;
}

const OrderForm: React.FC<OrderFormProps> = ({ mode = "page", orderId, onClose, onSuccess }) => {
    const { id: idFromRoute } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const isModal = mode === "modal";
    const id = isModal ? orderId : idFromRoute;

    const [loading, setLoading] = useState(false);
    const [allWorkTypes, setAllWorkTypes] = useState<WorkType[]>([]);
    const [editingCommentForWork, setEditingCommentForWork] = useState<number | null>(null);
    const [notification, setNotification] = useState<Notification>({ message: "", type: "success", visible: false });
    const [dictionariesLoaded, setDictionariesLoaded] = useState(false);

    const {
        control,
        handleSubmit,
        register,
        reset,
        watch,
        setValue,
        formState: { errors },
    } = useForm<OrderFormValues>({
        resolver: yupResolver(schema),
        defaultValues: {
            clientName: "",
            clientPhone: "",
            carBrand: "",
            works: [],
            arrivalDate: "",
            deliveryDate: "",
            orderCost: 0,
        },
    });

    const selectedWorks = watch("works");

    const showNotification = (message: string, type: "success" | "error") => {
        setNotification({ message, type, visible: true });
        setTimeout(() => setNotification(prev => ({ ...prev, visible: false })), 2000);
    };

    useEffect(() => {
        const loadDictionaries = async () => {
            try {
                const workTypesRes = await orderAPI.getDictionaryByType("WORK_TYPE");
                setAllWorkTypes(workTypesRes.data);
                setDictionariesLoaded(true);
            } catch (e) {
                console.error("Ошибка при загрузке справочников:", e);
            }
        };

        loadDictionaries();
    }, []);

    useEffect(() => {
        if (!id || !dictionariesLoaded) return;

        const loadOrder = async () => {
            setLoading(true);
            try {
                const response = await orderAPI.getById(id);
                const order: any = response.data;

                const arrivalDate = order.arrivalDate ? format(parseISO(order.arrivalDate), "yyyy-MM-dd'T'HH:mm") : "";
                const deliveryDate = order.deliveryDate ? format(parseISO(order.deliveryDate), "yyyy-MM-dd'T'HH:mm") : "";

                reset({
                    clientName: order.clientName || "",
                    clientPhone: order.clientPhone || "",
                    carBrand: typeof order.carBrand === "object" ? order.carBrand?.name : order.carBrand || "",
                    works: order.works || [],
                    arrivalDate,
                    deliveryDate,
                    orderCost: order.orderCost || 0,
                } as OrderFormValues);
            } catch (e) {
                console.error("Ошибка загрузки заказа:", e);
            } finally {
                setLoading(false);
            }
        };

        loadOrder();
    }, [id, dictionariesLoaded, reset]);

    const onSubmit: SubmitHandler<OrderFormValues> = async (data) => {
        try {
            const dataToSend: OrderPayload = {
                ...data,
                carBrand: data.carBrand,
            } as unknown as OrderPayload;

            if (id) {
                await orderAPI.update(id, dataToSend);
                showNotification("Заказ успешно обновлён!", "success");
            } else {
                await orderAPI.create(dataToSend);
                showNotification("Заказ успешно создан!", "success");
            }

            if (onSuccess) {
                onSuccess();
            }

            setTimeout(() => {
                if (isModal) {
                    if (onClose) onClose();
                } else {
                    navigate("/calendar");
                }
            }, 1000);
        } catch (error) {
            console.error("Ошибка сохранения:", error);
            showNotification("Произошла ошибка при сохранении заказа!", "error");
        }
    };

    const calcTotalCost = (works: any[]) =>
        (works || []).reduce((sum, w) => sum + (Number(w?.cost) || 0), 0);

    const handleWorkTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const workTypeId = Number(e.target.value);
        const isChecked = e.target.checked;
        const currentWorks = watch("works") || [];
        let updatedWorks;

        if (isChecked) {
            const workTypeToAdd = allWorkTypes.find(wt => wt.id === workTypeId);
            if (!workTypeToAdd) return;
            const newWork: any = { workType: workTypeToAdd, comment: "", cost: 0 };
            updatedWorks = [...currentWorks, newWork];
        } else {
            updatedWorks = currentWorks.filter(w => w.workType.id !== workTypeId);
        }

        setValue("works", updatedWorks, { shouldValidate: true });
        setValue("orderCost", calcTotalCost(updatedWorks), { shouldValidate: true });
    };

    const handleWorkCostChange = (workTypeId: number, value: string) => {
        const currentWorks = watch("works") || [];
        const numericValue = value === "" ? 0 : Number(value);
        const updatedWorks = currentWorks.map(w =>
            w.workType.id === workTypeId ? { ...w, cost: numericValue } : w
        );

        setValue("works", updatedWorks, { shouldValidate: true });
        setValue("orderCost", calcTotalCost(updatedWorks), { shouldValidate: true });
    };

    if (loading && id) return <p>Загрузка заказа...</p>;

    const formContent = (
        <>
            {notification.visible && (
                <div className={`notification ${notification.type}`}>
                    {notification.message}
                </div>
            )}

            <form onSubmit={handleSubmit(onSubmit as SubmitHandler<FieldValues>)} className={isModal ? "order-form order-form--modal" : "order-form"}>
                <input type="text" placeholder="Имя клиента" {...register("clientName")} className={errors.clientName ? "error" : ""} />
                {errors.clientName && <span className="error-text">{errors.clientName.message}</span>}

                <div className="form-group phone-input-container">
                    <Controller name="clientPhone" control={control} render={({ field }) => (
                        <PhoneInput {...field} country={"by"} onlyCountries={["by", "ru", "ua", "pl", "lt"]}
                                    placeholder="Телефон" inputStyle={{ width: "100%", height: "52px" }} />
                    )} />
                    {errors.clientPhone && <span className="error-text">{errors.clientPhone.message}</span>}
                </div>

                <div className="form-group">
                    <input
                        type="text"
                        placeholder="Марка автомобиля"
                        {...register("carBrand")}
                        className={errors.carBrand ? "error" : ""}
                    />
                    {errors.carBrand && <span className="error-text">{errors.carBrand.message}</span>}
                </div>

                <div className="checkbox-group">
                    <label>Тип работ:</label>
                    <div className="checkbox-container">
                        {allWorkTypes.map((workType) => {
                            const workIndex = (selectedWorks || []).findIndex(w => w.workType.id === workType.id);
                            const workInForm = workIndex !== -1 ? (selectedWorks || [])[workIndex] : null;
                            const isChecked = !!workInForm;

                            return (
                                <div key={workType.id} className="work-type-wrapper">
                                    <div className="checkbox-item-with-comment">
                                        <div className="checkbox-item">
                                            <input
                                                type="checkbox"
                                                id={`work-type-${workType.id}`}
                                                value={workType.id}
                                                checked={isChecked}
                                                onChange={handleWorkTypeChange}
                                            />
                                            {workType.color && (
                                                <span
                                                    className="work-type-color-badge"
                                                    style={{
                                                        display: "inline-block",
                                                        width: "14px",
                                                        height: "14px",
                                                        borderRadius: "50%",
                                                        backgroundColor: workType.color,
                                                        marginRight: "8px",
                                                        verticalAlign: "middle"
                                                    }}
                                                />
                                            )}
                                            <label htmlFor={`work-type-${workType.id}`}>{workType.name}</label>
                                        </div>

                                        {isChecked && workInForm && (
                                            <input
                                                id={`work-cost-${workType.id}`}
                                                type="number"
                                                min="0"
                                                className="work-cost-input"
                                                placeholder="Стоимость"
                                                value={workInForm.cost ?? 0}
                                                onChange={(e) => handleWorkCostChange(workType.id, e.target.value)}
                                                onWheel={(e) => e.currentTarget.blur()}
                                            />
                                        )}

                                        {isChecked && (
                                            <button type="button" className="edit-comment-btn"
                                                    onClick={() => setEditingCommentForWork(editingCommentForWork === workType.id ? null : workType.id)}>
                                                <PencilIcon />
                                            </button>
                                        )}
                                    </div>

                                    {isChecked && editingCommentForWork === workType.id && workInForm && (
                                        <div className="comment-input-container">
                                            <input
                                                type="text"
                                                className="comment-input"
                                                placeholder="Добавить комментарий..."
                                                value={workInForm.comment || ""}
                                                onChange={(e) => {
                                                    const updated = (selectedWorks || []).map(w =>
                                                        w.workType.id === workType.id ? { ...w, comment: e.target.value } : w
                                                    );
                                                    setValue("works", updated, { shouldValidate: true });
                                                }}
                                            />
                                            <button type="button" className="comment-save-btn" onClick={() => setEditingCommentForWork(null)}>Готово</button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {errors.works && typeof errors.works.message === "string" && (
                        <span className="error-text">{errors.works.message}</span>
                    )}
                </div>

                <div className="form-group order-form-dates" style={{ display: "flex", gap: "16px", marginBottom: "15px" }}>
                    <div className="form-group-half" style={{ flex: 1 }}>
                        <label>Дата поступления авто 📅:</label>
                        <Controller name="arrivalDate" control={control} render={({ field }) => (
                            <DatePicker
                                selected={field.value ? parseISO(field.value) : null}
                                locale={ru}
                                onChange={(date: Date | null) => {
                                    if (date) {
                                        // Устанавливаем время по умолчанию, например 09:00
                                        date.setHours(9, 0, 0, 0);
                                    }
                                    field.onChange(date ? format(date, "yyyy-MM-dd'T'HH:mm") : "");
                                }}
                                showTimeSelect timeFormat="HH:mm" dateFormat="dd.MM.yyyy HH:mm"
                                placeholderText="Выберите дату поступления"
                                className={errors.arrivalDate ? "error" : ""}
                            />
                        )} />
                        {errors.arrivalDate && <span className="error-text">{errors.arrivalDate.message}</span>}
                    </div>

                    <div className="form-group-half" style={{ flex: 1 }}>
                        <label>Дата выдачи авто 📅:</label>
                        <Controller name="deliveryDate" control={control} render={({ field }) => (
                            <DatePicker
                                selected={field.value ? parseISO(field.value) : null}
                                locale={ru}
                                onChange={(date: Date | null) => {
                                    if (date) {
                                        date.setHours(19, 0, 0, 0);
                                    }
                                    field.onChange(date ? format(date, "yyyy-MM-dd'T'HH:mm") : "");
                                }}
                                showTimeSelect timeFormat="HH:mm" dateFormat="dd.MM.yyyy HH:mm"
                                placeholderText="Выберите дату выдачи"
                                className={errors.deliveryDate ? "error" : ""}
                            />
                        )} />
                        {errors.deliveryDate && <span className="error-text">{errors.deliveryDate.message}</span>}
                    </div>
                </div>

                <div className="form-group">
                    <label htmlFor="orderCost">Стоимость заказа:</label>
                    <input id="orderCost" type="number"
                           placeholder="Стоимость" {...register("orderCost", { valueAsNumber: true })}
                           className={errors.orderCost ? "error" : ""}
                           onWheel={(e) => e.currentTarget.blur()} />
                    <span className="order-cost-hint">Считается автоматически по выбранным услугам, при необходимости можно скорректировать вручную</span>
                    {errors.orderCost && <span className="error-text">{errors.orderCost.message}</span>}
                </div>

                <div className="order-form-actions">
                    <button type="submit" disabled={loading}>{id ? "Обновить заказ" : "Сохранить заказ"}</button>
                    {isModal && (
                        <button type="button" className="order-form-cancel-btn" onClick={onClose} disabled={loading}>
                            Отмена
                        </button>
                    )}
                </div>
            </form>
        </>
    );

    if (!isModal) {
        return formContent;
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content order-form-modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{id ? `Заказ №${id}` : "Новый заказ"}</h2>
                    <button className="close-button" onClick={onClose}>&times;</button>
                </div>
                {formContent}
            </div>
        </div>
    );
};

export default OrderForm;