import React, { useCallback, useEffect, useRef, useState } from "react";
import { Controller, FieldValues, SubmitHandler, useForm } from "react-hook-form";
import * as Yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { useNavigate, useParams } from "react-router-dom";
import { orderAPI, OrderPayload } from "../../services/orderApi";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import "./OrderForm.css";
import { userAPI } from "../../services/userApi";
import { User } from "../../types/user";
import { CarBrand, InfoSource, MasterAssignment, Order, Work, WorkType } from "../../types/order";
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

const RoleSchema = Yup.object().shape({
    id: Yup.number().required(),
    name: Yup.string().required(),
});

const UserSchema = Yup.object().shape({
    id: Yup.number().required(),
    username: Yup.string().required(),
    firstName: Yup.string().required(),
    lastName: Yup.string().required(),
    phone: Yup.string().required(),
    roles: Yup.array().of(RoleSchema).required(),
});

const InfoSourceSchema = Yup.object().shape({
    id: Yup.number().required(),
    name: Yup.string().optional(),
    code: Yup.string().optional(),
}).nullable();

const schema = Yup.object().shape({
    clientName: Yup.string().required("Введите имя клиента"),
    clientPhone: Yup.string().required("Введите телефон"),
    carBrand: Yup.string().required("Выберите марку автомобиля"),
    vin: Yup.string().nullable().optional().default(null),
    works: Yup.array()
        .of(
            Yup.object().shape({
                id: Yup.number().optional(),
                workType: Yup.object().shape({
                    id: Yup.number().required(),
                    name: Yup.string().required(),
                    code: Yup.string().required(),
                }).required(),
                parts: Yup.array().of(
                    Yup.object().shape({
                        id: Yup.number().required(),
                        name: Yup.string().required(),
                        code: Yup.string().required(),
                    })
                ).required(),
                comment: Yup.string().nullable().optional(),
                cost: Yup.number()
                    .typeError("Укажите стоимость")
                    .required("Укажите стоимость работы")
                    .min(0, "Стоимость не может быть отрицательной"),
                assignments: Yup.array().of(
                    Yup.object().shape({
                        master: UserSchema.required("Выберите мастера"),
                        salaryPercent: Yup.number()
                            .typeError("Укажите %")
                            .required("Укажите процент")
                            .min(0, "Процент не может быть отрицательным")
                            .max(100, "Процент не может быть больше 100"),
                    })
                ).optional().default([]),
            })
        )
        .min(1, "Выберите хотя бы один тип работ")
        .required(),
    infoSource: InfoSourceSchema,
    executionDate: Yup.string().required("Укажите дату выполнения"),
    orderCost: Yup.number().typeError("Введите стоимость заказа").required("Введите стоимость заказа").min(0, "Стоимость не может быть отрицательной"),
    executionTimeByMaster: Yup.string().nullable().default(null),
});

type OrderFormValues = Yup.InferType<typeof schema>;

const OrderForm: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [brands, setBrands] = useState<CarBrand[]>([]);
    const [allWorkTypes, setAllWorkTypes] = useState<WorkType[]>([]);
    const [masters, setMasters] = useState<User[]>([]);
    const [editingCommentForWork, setEditingCommentForWork] = useState<number | null>(null);
    const [infoSourcesDict, setInfoSourcesDict] = useState<InfoSource[]>([]);
    const [dynamicWorkParts, setDynamicWorkParts] = useState<Record<number, WorkType[]>>({});
    const [loadingParts, setLoadingParts] = useState<Record<number, boolean>>({});
    const [notification, setNotification] = useState<Notification>({ message: "", type: "success", visible: false });
    const [dictionariesLoaded, setDictionariesLoaded] = useState(false);
    const dynamicWorkPartsRef = useRef(dynamicWorkParts);
    dynamicWorkPartsRef.current = dynamicWorkParts;

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
            vin: null,
            works: [],
            infoSource: null,
            executionDate: "",
            orderCost: 0,
            executionTimeByMaster: null,
        },
    });

    const selectedWorks = watch("works");
    const selectedInfoSource = watch("infoSource");

    const showNotification = (message: string, type: "success" | "error") => {
        setNotification({ message, type, visible: true });
        setTimeout(() => setNotification(prev => ({ ...prev, visible: false })), 2000);
    };

    const fetchPartsForWork = useCallback(async (workType: WorkType) => {
        if (dynamicWorkPartsRef.current[workType.id] !== undefined) return;
        if (!workType.code) return;

        setLoadingParts(prev => ({ ...prev, [workType.id]: true }));
        try {
            const response = await orderAPI.getDictionaryByType(workType.code);
            setDynamicWorkParts(prev => ({ ...prev, [workType.id]: response.data || [] }));
        } catch (err) {
            setDynamicWorkParts(prev => ({ ...prev, [workType.id]: [] }));
        } finally {
            setLoadingParts(prev => ({ ...prev, [workType.id]: false }));
        }
    }, []);

    useEffect(() => {
        const loadDictionaries = async () => {
            try {
                const [brandsRes, workTypesRes, mastersRes, infoSourcesRes] = await Promise.all([
                    orderAPI.getCarBrands(),
                    orderAPI.getDictionaryByType("WORK_TYPE"),
                    userAPI.getUsersByRole("MASTER"),
                    orderAPI.getDictionaryByType("INFO"),
                ]);

                setBrands(brandsRes.data.sort((a: CarBrand, b: CarBrand) => a.name.localeCompare(b.name)));
                setAllWorkTypes(workTypesRes.data);
                setMasters(Array.isArray(mastersRes.data) ? mastersRes.data : [mastersRes.data]);
                setInfoSourcesDict(infoSourcesRes.data);
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
                const order: Order = response.data;

                // Ensure we map assignment.master to full User from masters if possible
                const processedWorks = order.works.map(work => ({
                    ...work,
                    assignments: work.assignments?.map(assignment => {
                        // assignment.master might already be a User or an object with id
                        const masterId = (assignment.master as any)?.id ?? assignment.master;
                        const masterUser = masters.find(m => m.id === masterId);
                        return {
                            ...assignment,
                            master: masterUser || (assignment.master as any),
                        };
                    }) || []
                }));

                // preload parts for each workType
                await Promise.all(processedWorks.map(w => fetchPartsForWork(w.workType)));

                const executionDate = order.executionDate ? format(parseISO(order.executionDate), "yyyy-MM-dd'T'HH:mm") : "";

                reset({
                    ...order,
                    works: processedWorks,
                    carBrand: order.carBrand?.id.toString() || "",
                    infoSource: order.infoSource || null,
                    executionDate,
                } as unknown as OrderFormValues);
            } catch (e) {
                console.error("Ошибка загрузки заказа:", e);
            } finally {
                setLoading(false);
            }
        };

        loadOrder();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, dictionariesLoaded, reset, fetchPartsForWork, masters]);

    const onSubmit: SubmitHandler<OrderFormValues> = async (data) => {
        try {
            const carBrandObj = brands.find(brand => brand.id.toString() === data.carBrand) || null;
            const dataToSend: OrderPayload = {
                ...data,
                carBrand: carBrandObj,
                vin: data.vin || "",
                infoSource: data.infoSource,
            };

            if (id) {
                await orderAPI.update(id, dataToSend);
                showNotification("Заказ успешно обновлён!", "success");
            } else {
                await orderAPI.create(dataToSend);
                showNotification("Заказ успешно создан!", "success");
            }

            setTimeout(() => navigate("/"), 1000);
        } catch (error) {
            console.error("Ошибка сохранения:", error);
            showNotification("Произошла ошибка при сохранении заказа!", "error");
        }
    };

    // Handlers
    const handleWorkTypeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const workTypeId = Number(e.target.value);
        const isChecked = e.target.checked;
        const currentWorks = watch("works") || [];

        if (isChecked) {
            const workTypeToAdd = allWorkTypes.find(wt => wt.id === workTypeId);
            if (!workTypeToAdd) return;
            const newWork: Work = { workType: workTypeToAdd, parts: [], comment: "", cost: 0, assignments: [] };
            setValue("works", [...currentWorks, newWork], { shouldValidate: true });
            if (workTypeToAdd.code && !dynamicWorkParts[workTypeToAdd.id]) {
                await fetchPartsForWork(workTypeToAdd);
            }
        } else {
            setValue("works", currentWorks.filter(w => w.workType.id !== workTypeId), { shouldValidate: true });
        }
    };

    const handleWorkPartChange = (workTypeId: number, partId: number, isChecked: boolean) => {
        const currentWorks = watch("works") || [];
        const workInForm = currentWorks.find(w => w.workType.id === workTypeId);
        if (!workInForm) return;

        const partsForThisWork = dynamicWorkParts[workTypeId] || [];
        const partObject = partsForThisWork.find(p => p.id === partId);
        if (!partObject) return;

        const updatedParts = isChecked
            ? [...workInForm.parts, partObject]
            : workInForm.parts.filter(p => p.id !== partId);

        setValue("works", currentWorks.map(w => w.workType.id === workTypeId ? { ...w, parts: updatedParts } : w), { shouldValidate: true });
    };

    const handleMasterAssignmentChange = (workIndex: number, master: User, isChecked: boolean) => {
        const works = [...(watch("works") || [])];
        const work = works[workIndex];
        if (!work) return;

        if (isChecked) {
            // add assignment with default percent 0
            const newAssignments = [...work.assignments, { master, salaryPercent: 0 }];
            works[workIndex] = { ...work, assignments: newAssignments };
        } else {
            // remove assignment
            const newAssignments = work.assignments.filter(a => a.master.id !== master.id);
            works[workIndex] = { ...work, assignments: newAssignments };
        }

        setValue("works", works, { shouldValidate: true });
    };

    const handleSalaryPercentChange = (workIndex: number, masterId: number, percentStr: string) => {
        const works = [...(watch("works") || [])];
        const work = works[workIndex];
        if (!work) return;

        const newAssignments = work.assignments.map(a => a.master.id === masterId ? { ...a, salaryPercent: Number(percentStr) } : a);
        works[workIndex] = { ...work, assignments: newAssignments };
        setValue("works", works, { shouldValidate: true });
    };

    // Calculation helpers
    const getMasterSum = (cost: number | undefined | null, percent: number | undefined | null) => {
        const c = Number(cost || 0);
        const p = Number(percent || 0);
        const value = (c * p) / 100;
        return Number(value.toFixed(2));
    };

    const getTotalForWork = (work: Work) => {
        const cost = Number(work.cost || 0);
        const total = (work.assignments || []).reduce((acc, a) => acc + getMasterSum(cost, a.salaryPercent), 0);
        return total.toFixed(2);
    };

    if (loading && id) return <p>Загрузка заказа...</p>;

    return (
        <>
            {notification.visible && (
                <div className={`notification ${notification.type}`}>
                    {notification.message}
                </div>
            )}

            <form onSubmit={handleSubmit(onSubmit as SubmitHandler<FieldValues>)} className="order-form">
                <input type="text" placeholder="Имя клиента" {...register("clientName")} className={errors.clientName ? "error" : ""} />
                {errors.clientName && <span className="error-text">{errors.clientName.message}</span>}

                <div className="form-group phone-input-container">
                    <Controller name="clientPhone" control={control} render={({ field }) => (
                        <PhoneInput {...field} country={"by"} onlyCountries={["by", "ru", "ua", "pl", "lt"]}
                                    placeholder="Телефон" inputStyle={{ width: "100%", height: "52px" }} />
                    )} />
                    {errors.clientPhone && <span className="error-text">{errors.clientPhone.message}</span>}
                </div>

                {infoSourcesDict.length > 0 && (
                    <div className="checkbox-group info-source-group">
                        <label>Откуда узнали о нас (выберите один вариант):</label>
                        <div className="checkbox-container">
                            {infoSourcesDict.map((source) => (
                                <div key={source.id} className="checkbox-item">
                                    <input
                                        type="radio"
                                        name="infoSource"
                                        id={`info-source-${source.id}`}
                                        value={source.id}
                                        checked={selectedInfoSource?.id === source.id}
                                        onChange={() => setValue("infoSource", source, { shouldValidate: true })}
                                    />
                                    <label htmlFor={`info-source-${source.id}`}>{source.name}</label>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="form-group">
                    <select {...register("carBrand")} className={errors.carBrand ? "error" : ""}>
                        <option value="">Выберите марку автомобиля</option>
                        {brands.map((brand) => (<option key={brand.id} value={brand.id}>{brand.name}</option>))}
                    </select>
                    {errors.carBrand && <span className="error-text">{errors.carBrand.message}</span>}
                </div>

                <input type="text" placeholder="VIN (необязательно)" {...register("vin")} />

                <div className="checkbox-group">
                    <label>Тип работ:</label>
                    <div className="checkbox-container">
                        {allWorkTypes.map((workType) => {
                            const workIndex = (selectedWorks || []).findIndex(w => w.workType.id === workType.id);
                            const workInForm = workIndex !== -1 ? (selectedWorks || [])[workIndex] : null;
                            const isChecked = !!workInForm;
                            const workErrors = (errors.works?.[workIndex]) as any;

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
                                            <label htmlFor={`work-type-${workType.id}`}>{workType.name}</label>
                                        </div>

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

                                    {isChecked && workInForm && (
                                        <div className="work-details-container">
                                            <div className="form-group work-cost-container">
                                                <label htmlFor={`work-cost-${workType.id}`}>Стоимость работы:</label>
                                                <input
                                                    id={`work-cost-${workType.id}`}
                                                    type="number"
                                                    placeholder="0"
                                                    {...register(`works.${workIndex}.cost`, { valueAsNumber: true })}
                                                    className={workErrors?.cost ? "error" : ""}
                                                />
                                                {workErrors?.cost && <span className="error-text">{workErrors.cost.message}</span>}
                                            </div>

                                            {(dynamicWorkParts[workType.id] || []).length > 0 && (
                                                <div className="checkbox-group dynamic-parts-group">
                                                    <label className="dynamic-parts-label">Выберите детали ({workType.name}):</label>
                                                    {loadingParts[workType.id] ? (
                                                        <p className="dynamic-parts-loading">Загрузка деталей...</p>
                                                    ) : (
                                                        <div className="checkbox-container small-checkbox-container">
                                                            {(dynamicWorkParts[workType.id] || []).map((part) => (
                                                                <div key={part.id} className="checkbox-item small-checkbox-item">
                                                                    <input
                                                                        type="checkbox"
                                                                        id={`part-${workType.id}-${part.id}`}
                                                                        value={part.id}
                                                                        checked={workInForm.parts.some(p => p.id === part.id)}
                                                                        onChange={(e) => handleWorkPartChange(workType.id, part.id, e.target.checked)}
                                                                    />
                                                                    <label htmlFor={`part-${workType.id}-${part.id}`}>{part.name}</label>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {masters.length > 0 && (
                                                <div className="master-assignment-section">
                                                    <label>Назначить мастеров:</label>

                                                    {masters.map(master => {
                                                        const assignment = workInForm.assignments.find(a => a.master.id === master.id);
                                                        const isMasterChecked = !!assignment;
                                                        const assignmentIndex = workInForm.assignments.findIndex(a => a.master.id === master.id);
                                                        const assignmentErrors = workErrors?.assignments?.[assignmentIndex] as any;
                                                        const percent = assignment?.salaryPercent ?? 0;
                                                        const masterSum = getMasterSum(Number(workInForm.cost || 0), percent);

                                                        return (
                                                            <div key={master.id} className="master-assignment-item">
                                                                <div className="checkbox-item">
                                                                    <input
                                                                        type="checkbox"
                                                                        id={`master-${workType.id}-${master.id}`}
                                                                        checked={isMasterChecked}
                                                                        onChange={(e) => handleMasterAssignmentChange(workIndex, master, e.target.checked)}
                                                                    />
                                                                    <label htmlFor={`master-${workType.id}-${master.id}`}>{master.firstName} {master.lastName}</label>
                                                                </div>

                                                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                                    {isMasterChecked ? (
                                                                        <>
                                                                            <div className="percentage-input-container">
                                                                                {/* register percent only if assignment exists */}
                                                                                <input
                                                                                    type="number"
                                                                                    placeholder="%"
                                                                                    {...register(`works.${workIndex}.assignments.${assignmentIndex}.salaryPercent`, {
                                                                                        valueAsNumber: true,
                                                                                        onChange: (e) => handleSalaryPercentChange(workIndex, master.id, String(e.target.value))
                                                                                    })}
                                                                                    className={assignmentErrors?.salaryPercent ? "error" : ""}
                                                                                />
                                                                            </div>
                                                                            <div style={{ minWidth: 110, textAlign: "right" }}>
                                                                                <div style={{ fontSize: 13, fontWeight: 600 }}>Сумма:</div>
                                                                                <div>{masterSum.toFixed(2)} BYN</div>
                                                                            </div>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <div className="percentage-input-container">
                                                                                <input type="number" placeholder="%" disabled />
                                                                            </div>
                                                                            <div style={{ minWidth: 110, textAlign: "right", color: "#6c757d" }}>
                                                                                <div style={{ fontSize: 13, fontWeight: 600 }}>Сумма:</div>
                                                                                <div>0.00 BYN</div>
                                                                            </div>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}

                                                    {/* Total per work */}
                                                    <div style={{ marginTop: 12, fontWeight: 700 }}>
                                                        Итого по мастерам: {getTotalForWork(workInForm)} BYN
                                                    </div>
                                                </div>
                                            )}
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

                <div className="form-group order-form-date-cost">
                    <div className="form-group-half">
                        <label>Дата и время выполнения 📅:</label>
                        <Controller name="executionDate" control={control} render={({ field }) => (
                            <DatePicker
                                selected={field.value ? parseISO(field.value) : null}
                                locale={ru}
                                onChange={(date: Date | null) => field.onChange(date ? format(date, "yyyy-MM-dd'T'HH:mm") : "")}
                                showTimeSelect timeFormat="HH:mm" dateFormat="dd.MM.yyyy HH:mm"
                                placeholderText="Выберите дату"
                                className={errors.executionDate ? "error" : ""}
                            />
                        )} />
                        {errors.executionDate && <span className="error-text">{errors.executionDate.message}</span>}
                    </div>

                    <div className="form-group-half">
                        <label htmlFor="orderCost">Стоимость заказа:</label>
                        <input id="orderCost" type="number"
                               placeholder="Стоимость" {...register("orderCost", { valueAsNumber: true })}
                               className={errors.orderCost ? "error" : ""} />
                        {errors.orderCost && <span className="error-text">{errors.orderCost.message}</span>}
                    </div>
                </div>

                <input type="text" placeholder="Время выполнения (например, 2 часа)" {...register("executionTimeByMaster")} />

                <button type="submit" disabled={loading}>{id ? "Обновить заказ" : "Сохранить заказ"}</button>
            </form>
        </>
    );
};

export default OrderForm;
