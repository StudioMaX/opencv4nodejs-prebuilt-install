#ifndef __FF_CUSTOMATMALLOCATOR_H__
#define __FF_CUSTOMATMALLOCATOR_H__

#include <thread>
#include <stdint.h>
#include <uv.h>

#include "NativeNodeUtils.h"
#include "Size.h"
#include "coreUtils.h"
#include "matUtils.h"
#include "Vec.h"
#include "Point2.h"
#include "Rect.h"
#include "RotatedRect.h"

// only valid for 3.1.0+
#if CV_VERSION_GREATER_EQUAL(3, 1, 0)
    #define OPENCV4NODEJS_ENABLE_EXTERNALMEMTRACKING 1
#endif


#ifdef OPENCV4NODEJS_ENABLE_EXTERNALMEMTRACKING

class CustomMatAllocator : public cv::MatAllocator
{
public:
    // strange evilness of the functions being tagged const means that the fns cant change
    // stuff in the class instance.
    // so instead create constant pointer to a structure which we are allowed to change, even
    // from a const function.
    typedef struct tag_Variables {
        cv::Mutex MemTotalChangeMutex;
        int64_t TotalMem; // total mem allocated by this allocator
        int64_t CountMemAllocs;
        int64_t CountMemDeAllocs;
        int64_t TotalJSMem; // total mem told to JS so far

        // the main JS thread
        std::thread::id main_thread_id;
        v8::Isolate* isolate;
        uv_async_t async;
        bool asyncOpen;
    } VARIABLES;

    CustomMatAllocator();
    ~CustomMatAllocator( ) {
        delete variables;
        variables = NULL;
    }

    cv::UMatData* allocate(
		int dims, const int* sizes, int type, void* data0, size_t* step,
#if CV_VERSION_GREATER_EQUAL(4, 0, 0)
		cv::AccessFlag,
#else
		int /*flags*/,
#endif
		cv::UMatUsageFlags /*usageFlags*/
	) const;

    bool allocate(cv::UMatData* u,
#if CV_VERSION_GREATER_EQUAL(4, 0, 0)
		cv::AccessFlag,
#else
		int /*flags*/,
#endif
		cv::UMatUsageFlags /*usageFlags*/
	) const;

    void deallocate(cv::UMatData* u) const;

    int64_t readtotalmem();
    int64_t readmeminformed();
    int64_t readnumallocated();
    int64_t readnumdeallocated();

    // function which adjusts NAN mem to match allocated mem.
    // WILL ONLY ACTUALLY DO ANYTHING FROM MAIN JS LOOP
    void FixupJSMem() const;
    void ScheduleJSMemFixup() const;

    static void OnAsync(uv_async_t* handle);
    static void Cleanup(void* data);


    VARIABLES *variables;

    const cv::MatAllocator* stdAllocator;
};

// end only valid for 3.1.0+
#endif

#endif
