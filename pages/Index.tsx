const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center p-4">
      <div className="text-center max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
            منصة ToDo لمندوبات النشر
          </h1>
          <p className="text-xl text-muted-foreground mb-6">
            منصة احترافية لإدارة المهام اليومية وتتبع الأداء
          </p>
        </div>
        
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-pink-200">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-pink-800 mb-4">المميزات الرئيسية</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-right">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 bg-pink-500 rounded-full"></span>
                <span>مهام يومية (صباحية، وسط اليوم، مسائية)</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                <span>نظام النقاط والترتيب</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 bg-pink-500 rounded-full"></span>
                <span>تذكيرات تلقائية عبر SMS</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                <span>لوحة تحكم شاملة للمسؤول</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 bg-pink-500 rounded-full"></span>
                <span>نصائح يومية ذكية</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                <span>إحصائيات مفصلة ورسوم بيانية</span>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-pink-100 to-purple-100 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-pink-800 mb-2">📱 الخطوة التالية</h3>
            <p className="text-pink-700">
              لتفعيل جميع المميزات المتقدمة مثل قاعدة البيانات، الرسائل النصية، والإشعارات،
              يرجى ربط المشروع بـ Supabase أولاً
            </p>
          </div>
          
          <div className="text-sm text-muted-foreground">
            الفترة الزمنية: 13/8/2025 - 13/9/2025 | دعم أكثر من 200 مستخدم
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
